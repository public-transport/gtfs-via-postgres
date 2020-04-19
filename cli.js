#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v'
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    gtfs-to-sql <gtfs-file> ...
Options:
Examples:
    gtfs-to-sql some-gtfs/stops.txt some-gtfs/stop_times.txt
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {basename, extname} = require('path')
const readCsv = require('gtfs-utils/read-csv')
const {Transform} = require('stream')
const stdout = require('stdout-stream')
const {format, schemas} = require('.')
const converter = require('./lib/converter')

const files = argv._

const pump = (src, through, dest) => {
	return new Promise((resolve, reject) => {
		src.once('error', reject)
		through.once('error', reject)
		dest.once('error', reject)
		through.once('end', () => {
			src.removeListener('error', reject)
			through.removeListener('error', reject)
			dest.removeListener('error', reject)
			resolve()
		})
		src.pipe(through).pipe(dest)
	})
}

;(async () => {
	process.stdout.write(`\
\\set ON_ERROR_STOP on;
CREATE EXTENSION IF NOT EXISTS postgis;
\n`)

	for (const file of files) {
		const name = basename(file, extname(file))
		process.stdout.write(`-- ${name}\n-----------------\n\n`)

		if (!schemas[name]) {
			throw new Error('invalid/unsupported file: ' + name)
		}
		const schema = schemas[name]
		process.stdout.write(schema + '\n\n')

		const formatter = format[name]
		await pump(
			readCsv(file),
			converter(formatter),
			stdout,
		)
	}
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
