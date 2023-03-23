'use strict'

const {strictEqual} = require('assert')
const pkg = require('../package.json')

const afterAll = (opt) => {
	strictEqual(typeof opt.importStart, 'number', 'opt.importStart must be a number')

	// todo: escape properly
	return `\
CREATE OR REPLACE FUNCTION "${opt.schema}".gtfs_data_imported_at ()
RETURNS TIMESTAMP WITH TIME ZONE
AS $$
	SELECT '${new Date(opt.importStart).toISOString()}'::timestamp with time zone;
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION "${opt.schema}".gtfs_via_postgres_version ()
RETURNS TEXT
AS $$
	SELECT '${pkg.version}';
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION "${opt.schema}".gtfs_via_postgres_options ()
RETURNS jsonb
AS $$
	SELECT '${JSON.stringify(opt).replace(/'/g, `''`)}'::jsonb;
$$ LANGUAGE SQL IMMUTABLE;
`
}

module.exports = {
	afterAll,
}
