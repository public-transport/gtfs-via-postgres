'use strict'

const createDebug = require('debug')
const sequencify = require('sequencify')
const {DuckDBInstance} = require('@duckdb/node-api')
const formatters = require('./lib')
const getDependencies = require('./lib/deps')
const RUN = require('./lib/run.js')
const GET = require('./lib/get.js')

const debug = createDebug('gtfs-via-duckdb')
const debugSql = createDebug('gtfs-via-duckdb:sql')

const convertGtfsToSql = async (pathToDb, files, opt = {}) => {
	debug('pathToDb', pathToDb)

	opt = {
		silent: false,
		// todo [breaking]: make the default!
		requireDependencies: false,
		ignoreUnsupportedFiles: false,
		routeTypesScheme: 'google-extended',
		tripsWithoutShapeId: !files.some(f => f.name === 'shapes'),
		routesWithoutAgencyId: false,
		stopsWithoutLevelId: !files.some(f => f.name === 'levels'),
		stopsLocationIndex: false,
		lowerCaseLanguageCodes: false,
		statsByRouteIdAndDate: 'none',
		statsByAgencyIdAndRouteIdAndStopAndHour: 'none',
		statsActiveTripsByHour: 'none',
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
	opt.files = fileNames
	const deps = getDependencies(opt, fileNames)
	debug('deps', deps)

	const tasks = { // file name -> [dep name]
		'valid_lang_codes': {
			dep: [],
		},
		'valid_timezones': {
			dep: [],
		},

		// todo: currently doesn't fail if *neither* calendar nor calendar_dates is present!

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

		...(importMetadata ? {
			'import_metadata': {
				dep: [],
			},
		} : {}),

		...(statsByRouteIdAndDate !== 'none' ? {
			'stats_by_route_date': {
				dep: ['stop_times'],
			},
		} : {}),
		...(statsByAgencyIdAndRouteIdAndStopAndHour !== 'none' ? {
			'stats_by_agency_route_stop_hour': {
				dep: ['stop_times'],
			},
		} : {}),
		...(statsActiveTripsByHour !== 'none' ? {
			'stats_active_trips_by_hour': {
				dep: ['stop_times'],
			},
		} : {}),
	}

	for (const file of files) {
		if (!formatters[file.name]) {
			throw new Error('invalid/unsupported file: ' + file.name)
		}

		const dependencies = deps[file.name] || []
		for (const dep of dependencies) {
			if (requireDependencies && !tasks[dep] && !fileNames.includes(dep)) {
				// todo: improve error message & CLI output!
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

	const instance = await DuckDBInstance.create(pathToDb)
	const db = await instance.connect()
	db[RUN] = async (query, ...args) => {
		debugSql('db[RUN]', query, ...args)
		try {
			return await db.run(query, ...args)
		} catch (err) {
			err.query = query
			err.args = args
			throw err
		}
	}
	db[GET] = async (query, ...args) => {
		debugSql('db[GET]', query, ...args)
		try {
			const result = await db.runAndReadAll(query, ...args)
			return result.getRowObjects()
		} catch (err) {
			err.query = query
			err.args = args
			throw err
		}
	}

	await db[RUN](`
-- todo
-- BEGIN TRANSACTION;
`)

	const nrOfRowsByName = new Map()
	const workingState = {
		nrOfRowsByName,
	}

	for (const name of order) {
		if (!silent) console.error(name)
		const task = tasks[name]

		const importData = formatters[name]

		// calendar's & calendar_dates's importData() should run even if their respective files are not present.
		// Also, the frequencies table is needed for stop_times's arrivals_departures & connections views.
		if (!task.file && importData.runDespiteMissingSrcFile !== true) {
			continue
		}

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
