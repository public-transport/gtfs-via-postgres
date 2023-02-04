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
		'route-types-scheme': {
			type: 'string',
		},
		'trips-without-shape-id': {
			type: 'boolean',
		},
		'routes-without-agency-id': {
			type: 'boolean',
		},
		'stops-without-level-id': {
			type: 'boolean',
		},
		'stops-location-index': {
			type: 'boolean',
		},
		'stats-by-route-date': {
			type: 'string',
		},
		'schema': {
			type: 'string',
		},
		'postgraphile': {
			type: 'boolean',
		},
		'import-metadata': {
			type: 'boolean',
		}
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
    --route-types-scheme          Set of route_type values to support.
                                    - basic: core route types in the GTFS spec
                                    - google-extended: Extended GTFS Route Types [1]
                                    - tpeg-pti: proposed TPEG-PTI-based route types [2]
                                    Default: google-extended
    --trips-without-shape-id      Don't require trips.txt items to have a shape_id.
    --routes-without-agency-id    Don't require routes.txt items to have an agency_id.
    --stops-without-level-id      Don't require stops.txt items to have a level_id.
                                  Default if levels.txt has not been provided.
    --stops-location-index        Create a spatial index on stops.stop_loc for efficient
                                    queries by geolocation.
    --stats-by-route-date         Wether to generate a stats_by_route_date view
                                    letting you analyze all data per routes and/or date:
                                    - none: Don't generate a view.
                                    - view: Fast generation, slow access.
                                    - materialized-view: Slow generation, fast access.
                                    Default: none
    --schema                      The schema to use for the database. Default: public
    --postgraphile                Tweak generated SQL for PostGraphile usage.
                                    https://www.graphile.org/postgraphile/
    --import-metadata             Create functions returning import metadata:
                                    - gtfs_data_imported_at (timestamp with time zone)
                                    - gtfs_via_postgres_version (text)
                                    - gtfs_via_postgres_options (jsonb)
Examples:
    gtfs-to-sql some-gtfs/*.txt | psql -b # import into PostgreSQL
    gtfs-to-sql -u -- some-gtfs/*.txt | gzip >gtfs.sql # generate a gzipped SQL dump

[1] https://developers.google.com/transit/gtfs/reference/extended-route-types
[2] https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
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
	routeTypesScheme: flags['route-types-scheme'] || 'google-extended',
	tripsWithoutShapeId: !!flags['trips-without-shape-id'],
	routesWithoutAgencyId: !!flags['routes-without-agency-id'],
	stopsLocationIndex: !!flags['stops-location-index'],
	statsByRouteIdAndDate: flags['stats-by-route-date'] || 'none',
	schema: flags['schema'] || 'public',
	postgraphile: !!flags.postgraphile,
	importMetadata: !!flags['import-metadata'],
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
