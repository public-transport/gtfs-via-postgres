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
		'trips-without-shape-id',
		'stops-without-level-id',
		'stops-location-index',
		'postgraphile',
	]
})

if (argv.help || argv.h) {
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

if (argv.version || argv.v) {
	process.stdout.write(`${pkg.name} v${pkg.version}\n`)
	process.exit(0)
}

const {basename, extname} = require('path')
const {pipeline} = require('stream')
const convertGtfsToSql = require('./index')

const files = argv._.map((file) => {
	const name = basename(file, extname(file))
	return {name, file}
})

const opt = {
	silent: !!(argv.silent || argv.s),
	requireDependencies: !!(argv['require-dependencies'] || argv.d),
	ignoreUnsupportedFiles: !!(argv['ignore-unsupported'] || argv.u),
	tripsWithoutShapeId: !!argv['trips-without-shape-id'],
	routesWithoutAgencyId: !!argv['routes-without-agency-id'],
	stopsLocationIndex: !!argv['stops-location-index'],
	schema: argv['schema'] || 'public',
	postgraphile: !!argv.postgraphile,
}
if ('stops-without-level-id' in argv) {
	opt.stopsWithoutLevelId = !!argv['stops-without-level-id']
}

pipeline(
	convertGtfsToSql(files, opt),
	process.stdout,
	(err) => {
		if (!err) return;
		if (err.code !== 'EPIPE') console.error(err)
		process.exit(1)
	}
)
