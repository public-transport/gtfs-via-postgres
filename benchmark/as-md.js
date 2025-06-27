#!/usr/bin/env node

const {createInterface} = require('node:readline')

let keys

const linewise = createInterface({
	input: process.stdin,
	// Note: We use the crlfDelay option to recognize all instances of CR LF as a single line break.
	crlfDelay: Infinity,
})

;(async () => {
	let firstRow = true
	for await (const line of linewise) {
		const row = JSON.parse(line)

		if (firstRow) {
			firstRow = false

			keys = Object.keys(row).filter(key => key !== 'filename')
			process.stdout.write(`| ${keys.join(' | ')} |\n`)
			process.stdout.write(`| ${keys.map(_ => '-').join(' | ')} |\n`)
		}

		const formattedVals = keys
		.map(key => [key, row[key]])
		.map(([key, val]) => {
			if (key === 'query') return '<pre>' + val.trim().replace(/\n/g, '<br>') + '</pre>'
			return typeof val === 'number' && !Number.isInteger(val) ? Math.round(val * 100) / 100 : val
		})
		process.stdout.write(`| ${formattedVals.join(' | ')} |\n`)
	}
})()
