#!/usr/bin/env node
'use strict'

const {parseArgs} = require('util')
const pkg = require('./package.json')

const {
	values: flags,
	positionals: args,
} = parseArgs({
	options: {
		'help': {
			type: 'boolean',
			short: 'h',
		},
		'version': {
			type: 'boolean',
			short: 'v',
		},
		'silent': {
			type: 'boolean',
			short: 's',
		},
		'require-dependencies': {
			type: 'boolean',
			short: 'd',
		},
		'ignore-unsupported': {
			type: 'boolean',
			short: 'u',
		},
		'trips-without-shape-id': {
			type: 'boolean',
		},
		'stops-without-level-id': {
			type: 'boolean',
		},
		'stops-location-index': {
			type: 'boolean',
		},
		'schema': {
			type: 'string',
		},
		'postgraphile': {
			type: 'boolean',
		},
	},
	allowPositionals: true,
})

if (flags.help) {
	process.stdout.write(`
Usage:
    gtfs-to-sql [options] [--] <gtfs-file> ...
Options:
    --silent                  -s  Don't show files being converted.
    --require-dependencies    -d  Require files that the specified GTFS files depend
                                  on to be specified as well (e.g. stop_times.txt
                                  requires trips.txt). Default: false
    --ignore-unsupported      -u  Ignore unsupported files. Default: false
    --trips-without-shape-id      Don't require trips.txt items to have a shape_id.
    --routes-without-agency-id    Don't require routes.txt items to have an agency_id.
    --stops-without-level-id      Don't require stops.txt items to have a level_id.
                                  Default if levels.txt has not been provided.
    --stops-location-index        Create a spatial index on stops.stop_loc for efficient
                                    queries by geolocation.
    --schema                      The schema to use for the database. Default: public
    --postgraphile                Tweak generated SQL for PostGraphile usage.
                                    https://www.graphile.org/postgraphile/
Examples:
    gtfs-to-sql some-gtfs/*.txt | psql -b # import into PostgreSQL
    gtfs-to-sql -u -- some-gtfs/*.txt | gzip >gtfs.sql # generate a gzipped SQL dump
\n`)
	process.exit(0)
}

if (flags.version) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {basename, extname} = require('path')
const {pipeline} = require('stream')
const convertGtfsToSql = require('./index')

const files = args.map((file) => {
	const name = basename(file, extname(file))
	return {name, file}
})

const opt = {
	silent: !!flags.silent,
	requireDependencies: !!flags['require-dependencies'],
	ignoreUnsupportedFiles: !!flags['ignore-unsupported'],
	tripsWithoutShapeId: !!flags['trips-without-shape-id'],
	routesWithoutAgencyId: !!flags['routes-without-agency-id'],
	stopsLocationIndex: !!flags['stops-location-index'],
	schema: flags['schema'] || 'public',
	postgraphile: !!flags.postgraphile,
}
opt.stopsWithoutLevelId = !flags['stops-without-level-id']

pipeline(
	convertGtfsToSql(files, opt),
	process.stdout,
	(err) => {
		if (!err) return;
		if (err.code !== 'EPIPE') console.error(err)
		process.exit(1)
	}
)
