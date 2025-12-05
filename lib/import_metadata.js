'use strict'

const {strictEqual} = require('assert')
const RUN = require('./run.js')
const pkg = require('../package.json')

const populateImportMetadata = async (db, _, opt) => {
	strictEqual(typeof opt.importStart, 'number', 'opt.importStart must be a number')

	// todo: escape properly
	await db[RUN](`\
CREATE OR REPLACE FUNCTION gtfs_data_imported_at ()
AS (
	'${new Date(opt.importStart).toISOString()}'::timestamp with time zone
);

CREATE OR REPLACE FUNCTION gtfs_via_duckdb_version ()
AS (
	'${pkg.version}'::text
);

CREATE OR REPLACE FUNCTION gtfs_via_duckdb_options ()
AS (
	'${JSON.stringify(opt).replace(/'/g, `''`)}'::json
);
`)
}
populateImportMetadata.runDespiteMissingSrcFile = true

module.exports = populateImportMetadata
