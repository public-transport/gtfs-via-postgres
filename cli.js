#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
		'silent', 's',
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    gtfs-to-sql <gtfs-file> ...
Options:
    --silent  -s  Don't show files being converted.
Examples:
    gtfs-to-sql some-gtfs/*.txt >gtfs.sql
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {promisify} = require('util')
const {basename, extname} = require('path')
const sequencify = require('sequencify')
const readCsv = require('gtfs-utils/read-csv')
const {PassThrough} = require('stream')
// const stdout = require('stdout-stream')
const formatters = require('.')
const deps = require('./lib/deps')
const converter = require('./lib/converter')

const files = argv._.map((file) => {
	const name = basename(file, extname(file))
	return {name, file}
})
for (const {name} of files) {
	if (!formatters[name]) {
		throw new Error('invalid/unsupported file: ' + name)
	}
}

const tasks = {}
for (const file of files) {
	const isAvailable = name => files.find(f => f.name === name)
	tasks[file.name] = {
		...file,
		dep: (deps[file.name] || []).filter(isAvailable)
	}
}
const order = []
sequencify(tasks, files.map(f => f.name), order)

const silent = argv.silent || argv.s

;(async () => {
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
})()
.catch((err) => {
	if (err && err.code !== 'EPIPE') console.error(err)
	process.exit(1)
})
