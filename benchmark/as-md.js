#!/usr/bin/env node

const {pipeline, Transform} = require('stream')
const csvParser = require('csv-parser')
const {ok} = require('assert')

let firstRow = true

pipeline(
	process.stdin,
	csvParser(),
	new Transform({
		objectMode: true,
		transform: function (row, _, cb) {
			if (firstRow) {
				firstRow = false

				const keys = Object.keys(row)
				process.stdout.write(`| ${keys.join(' | ')} |\n`)
				process.stdout.write(`| ${keys.map(_ => '-').join(' | ')} |\n`)
			}

			const formattedVals = Object.entries(row)
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
