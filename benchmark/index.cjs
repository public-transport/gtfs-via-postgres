#!/usr/bin/env node

const {parseArgs} = require('node:util')
const {readFile} = require('node:fs/promises')
const {DuckDBInstance} = require('@duckdb/node-api')
const {Bench: Benchmark} = require('tinybench')
const {basename} = require('node:path')

// adapted from https://stackoverflow.com/a/55297611/1072129
const quantile = (sorted, q) => {
	const pos = (sorted.length - 1) * q
	const base = Math.floor(pos)
	const rest = pos - base
	if (base + 1 < sorted.length) {
		return sorted[base] + rest * (sorted[base + 1] - sorted[base])
	} else {
		return sorted[base]
	}
}

const {
	values: flags,
	positionals: args,
} = parseArgs({
	options: {
		'help': {
			type: 'boolean',
			short: 'h',
		},
	},
	allowPositionals: true,
})

if (flags.help) {
	process.stdout.write(`
Usage:
    benchmark [options] [--] <db-file> <sql-file> ...
\n`)
	process.exit(0)
}

;(async () => {

const [pathToDb, ...queryFiles] = args
if (!pathToDb) {
	console.error('you must pass the path to a DuckDB db file')
	process.exit(1)
}
if (queryFiles.length === 0) {
	console.error('you must pass >0 SQL files')
	process.exit(1)
}
const instance = await DuckDBInstance.create(pathToDb, {
	access_mode: 'READ_ONLY',
})
const db = await instance.connect()

await db.run(`\
INSTALL spatial;
LOAD spatial;
`)

const queriesByName = new Map()
const benchmark = new Benchmark({
	// - The default minimum number of iterations is too high.
	// - The default minimum time is too low.
	warmup: true,
	warmupIterations: 1,
	warmupTime: 5000, // 5s
	iterations: 3,
	time: 10000, // 10s
	retainSamples: true, // retain task.result.latency.samples
})
await Promise.all(
	queryFiles
	.filter(queryFile => queryFile.slice(-9) !== '.skip.sql')
	.map(async (queryFile) => {
		const name = basename(queryFile)
		const query = await readFile(queryFile, {encoding: 'utf8'})
		queriesByName.set(name, query)
		benchmark.add(name, async () => {
			await db.run(query)
		})
	}),
)

// do all queries once, to make sure they work
for (const [name, query] of queriesByName.entries()) {
	try {
		await db.run(query)
	} catch (err) {
		err.benchmark = name
		err.query = query
		throw err
	}
}

benchmark.addEventListener('cycle', (ev) => {
	const {task} = ev
	const query = queriesByName.get(task.name)
	if ('error' in task.result) {
		console.error(task.result)
		process.exit(1)
	}
	const samples = Array.from(task.result.latency.samples).sort()
	console.log(JSON.stringify({
		query,
		avg: task.result.latency.mean,
		min: task.result.latency.min,
		p25: quantile(samples, .25),
		p50: task.result.latency.p50,
		p75: task.result.latency.p75,
		p95: quantile(samples, .95),
		p99: task.result.latency.p99,
		max: task.result.latency.max,
		iterations: task.result.latency.samplesCount,
	}))
})

await benchmark.run()

})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
