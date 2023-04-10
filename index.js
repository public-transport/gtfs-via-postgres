'use strict'

const createDebug = require('debug')
const sequencify = require('sequencify')
const {Database} = require('duckdb')
const {promisify} = require('util')
const formatters = require('./lib')
const getDependencies = require('./lib/deps')
const RUN = require('./lib/run.js')
const GET = require('./lib/get.js')
const pkg = require('./package.json')

// todo: rename
const debug = createDebug('gtfs-via-postgres')
const debugSql = createDebug('gtfs-via-postgres:sql')

const convertGtfsToSql = async (pathToDb, files, opt = {}) => {
	debug('pathToDb', pathToDb)

	opt = {
		silent: false,
		requireDependencies: false,
		ignoreUnsupportedFiles: false,
		routeTypesScheme: 'google-extended',
		tripsWithoutShapeId: !files.some(f => f.name === 'shapes'),
		routesWithoutAgencyId: false,
		stopsWithoutLevelId: !files.some(f => f.name === 'levels'),
		lowerCaseLanguageCodes: false,
		statsByRouteIdAndDate: 'none',
		statsByAgencyIdAndRouteIdAndStopAndHour: 'none',
		statsActiveTripsByHour: 'none',
		schema: 'main',
		importMetadata: false,
		...opt,
	}
	debug('opt', opt)
	const {
		silent,
		tripsWithoutShapeId,
		requireDependencies,
		ignoreUnsupportedFiles,
		importMetadata,
		statsByRouteIdAndDate,
		statsByAgencyIdAndRouteIdAndStopAndHour,
		statsActiveTripsByHour,
	} = opt

	if (ignoreUnsupportedFiles) {
		files = files.filter(f => !!formatters[f.name])
	}
	debug('files', files)

	const fileNames = files.map(f => f.name)
	const deps = getDependencies(opt, fileNames)
	debug('deps', deps)

	const tasks = { // file name -> [dep name]
		'valid_lang_codes': {
			dep: [],
		},
		'valid_timezones': {
			dep: [],
		},

		// special handling of calendar/calendar_dates:
		// service_days relies on *both* calendar's & calendar_dates' tables to
		// be present, so we add mock tasks here. Each of these mock tasks get
		// replaced by a file-based one below if the file has been passed.
		'calendar': {
			dep: [],
		},
		'calendar_dates': {
			dep: [],
		},
		'service_days': {
			dep: ['calendar', 'calendar_dates'],
		},

		// The arrivals_departures & connections views rely on frequencies' table
		// to be present, so we add a mock task here. It gets replaced by a
		// file-based one below if the file has been passed.
		'frequencies': {
			dep: [...deps.frequencies],
		},
	}

	for (const file of files) {
		if (!formatters[file.name]) {
			throw new Error('invalid/unsupported file: ' + file.name)
		}

		const dependencies = deps[file.name] || []
		for (const dep of dependencies) {
			if (requireDependencies && !tasks[dep] && !fileNames.includes(dep)) {
				const err = new Error(`${file.name} depends on ${dep}`)
				err.code = 'MISSING_GTFS_DEPENDENCY'
				throw err
			}
		}

		tasks[file.name] = {
			file: file.file,
			dep: Array.from(dependencies),
		}
	}
	debug('tasks', tasks)

	const order = []
	sequencify(tasks, Object.keys(tasks), order)
	debug('order', order)

	opt.importStart = Date.now()

	const db = new Database(pathToDb)
	const createQueryDb = (method, logPrefix) => {
		const queryDb = (query, ...additionalArgs) => {
			debugSql(logPrefix, query, ...additionalArgs)
			return new Promise((resolve, reject) => {
				db[method](query, ...additionalArgs, (err, result) => {
					if (err) {
						err.query = query
						reject(err)
					} else {
						resolve(result)
					}
				})
			})
		}
		return queryDb
	}
	db[RUN] = createQueryDb('run', 'DB[RUN]')
	db[GET] = createQueryDb('all', 'DB[GET]')

	await db[RUN](`
-- BEGIN TRANSACTION;
CREATE SCHEMA IF NOT EXISTS "${opt.schema}";
`)

	const nrOfRowsByName = new Map()
	const workingState = {
		nrOfRowsByName,
	}

	for (const name of order) {
		if (!silent) console.error(name)
		const task = tasks[name]

		const importData = formatters[name]

		try {
			await importData(db, task.file || null, opt, workingState)
		} catch (err) {
			err.gtfsFile = name
			throw err
		}
	}

	debug('workingState', workingState)

	// todo
	// await db[RUN]('COMMIT')
	debug('done!')
}

module.exports = convertGtfsToSql
