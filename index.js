'use strict'

const sequencify = require('sequencify')
const readCsv = require('gtfs-utils/read-csv')
const {PassThrough} = require('stream')
const formatters = require('./lib')
const deps = require('./lib/deps')
const converter = require('./lib/converter')

const convertGtfsToSql = async (files, opt = {}) => {
	const {
		silent,
		requireDependencies,
		ignoreUnsupportedFiles,
	} = {
		silent: false,
		requireDependencies: false,
		ignoreUnsupportedFiles: false,
		...opt,
	}

	if (ignoreUnsupportedFiles) {
		files = files.filter(f => !!formatters[f.name])
	}
	const isAvailable = name => files.some(f => f.name === name)
	for (const {name} of files) {
		if (!formatters[name]) {
			throw new Error('invalid/unsupported file: ' + name)
		}
		if (requireDependencies) {
			for (const dep of deps[name] || []) {
				if (!isAvailable(dep)) {
					throw new Error(name + ' depends on ' + dep)
				}
			}
		}
	}

	const tasks = {}
	for (const file of files) {
		tasks[file.name] = {
			...file,
			dep: (deps[file.name] || []).filter(isAvailable)
		}
	}
	const order = []
	sequencify(tasks, files.map(f => f.name), order)

	process.stdout.write(`\
\\set ON_ERROR_STOP on;
CREATE EXTENSION IF NOT EXISTS postgis;
BEGIN;
\n`)

	for (const name of order) {
		if (!silent) console.error(name)
		process.stdout.write(`-- ${name}\n-----------------\n\n`)

		const {file} = tasks[name]
		const src = readCsv(file)
		const convert = converter(formatters[name])
		const dest = process.stdout

		await new Promise((resolve, reject) => {
			const onErr = (err) => {
				src.destroy()
				convert.destroy()
				dest.removeListener('error', onErr)
				reject(err)
			}
			src.once('error', onErr)
			convert.once('error', onErr)
			dest.on('error', onErr)
			convert.once('end', () => {
				// todo: this is extremely ugly, fix this
				setTimeout(resolve, 3000)
			})
			src.pipe(convert).pipe(dest)
		})
	}

	process.stdout.write(`\
COMMIT;`)
}

module.exports = convertGtfsToSql
