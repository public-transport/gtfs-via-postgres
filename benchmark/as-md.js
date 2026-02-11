#!/usr/bin/env node

const {pipeline, Transform} = require('stream')
const csvParser = require('csv-parser')
const {ok} = require('assert')

let firstRow = true
let keys

pipeline(
	process.stdin,
	csvParser(),
	new Transform({
		objectMode: true,
		transform: function (row, _, cb) {
			if (firstRow) {
				firstRow = false

				keys = Object.keys(row).filter(key => key !== 'filename')
				process.stdout.write(`| ${keys.join(' | ')} |\n`)
				process.stdout.write(`| ${keys.map(_ => '-').join(' | ')} |\n`)
			}

			const formattedVals = keys
			.map(key => [key, row[key]])
			.map(([key, val]) => {
				if (key === 'query') return '<pre>' + val.replace(/\n/g, '<br>') + '</pre>'
				return val
			})
			process.stdout.write(`| ${formattedVals.join(' | ')} |\n`)

			cb()
		},
	}),
	process.stdout,
	(err) => {
		if (!err) return;
		console.error(err)
		process.exit(1)
	},
)
