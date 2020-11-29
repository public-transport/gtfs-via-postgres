#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
		'silent', 's',
		'require-dependencies', 'd',
		'ignore-unsupported', 'u',
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    gtfs-to-sql <gtfs-file> ...
Options:
    --silent                -s  Don't show files being converted.
    --require-dependencies  -d  Require files that the specified GTFS files depend
                                on to be specified as well (e.g. stop_times.txt
                                requires trips.txt). Default: false
    --ignore-unsupported    -u  Ignore unsupported files. Default: false
Examples:
    gtfs-to-sql -u some-gtfs/*.txt >gtfs.sql
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {basename, extname} = require('path')
const convertGtfsToSql = require('./index')

const files = argv._.map((file) => {
	const name = basename(file, extname(file))
	return {name, file}
})

convertGtfsToSql(files, {
	silent: !!(argv.silent || argv.s),
	requireDependencies: !!(argv['require-dependencies'] || argv.d),
	ignoreUnsupportedFiles: !!(argv['ignore-unsupported'] || argv.u),
})
.catch((err) => {
	if (err && err.code !== 'EPIPE') console.error(err)
	process.exit(1)
})
