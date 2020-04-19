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
const {format, schemas} = require('.')
const sql = require('./lib/sql')

;(async () => {
	const files = argv._
	for (const file of files) {
		const name = basename(file, extname(file))
		process.stdout.write(`-- ${name}\n-----------------\n\n`)

		if (!schemas[name]) {
			throw new Error('invalid/unsupported file: ' + name)
		}
		const schema = schemas[name]
		process.stdout.write(schema + '\n\n')

		const formatter = format[name]
		let first = true
		function write (row, _, cb) {
			if (first) {
				first = false
				this.push(formatter(sql, row, true))
			} else {
				this.push(formatter(sql, row, false))
			}
			cb()
		}
		function writev (chunks, _, cb) {
			for (let i = 0; i < chunks.length; i++) {
				const row = chunks[i].chunk
				if (first) {
					first = false
					this.push(formatter(sql, row, true))
				} else {
					this.push(formatter(sql, row, false))
				}
			}
			cb()
		}
		const convert = new Transform({objectMode: true, write}) // todo

		await new Promise((resolve, reject) => {
			const src = readCsv(file)
			const dest = process.stdout
			const done = () => {
				src.removeListener('error', reject)
				convert.removeListener('error', reject)
				dest.removeListener('error', reject)
				resolve()
			}
			src.once('error', reject)
			convert.once('error', reject)
			dest.once('error', reject)
			convert.once('end', done)
			src.pipe(convert).pipe(dest)
		})
	}
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
