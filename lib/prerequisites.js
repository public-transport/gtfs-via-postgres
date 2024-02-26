'use strict'

const RUN = require('./run.js')

const icu = async (db, opt) => {
	await db[RUN](`LOAD ICU`)
}

// const is_valid_lang_code = {
// 	beforeAll: (opt) => `\
// -- Unfortunately information_schema.collations.collation_name only has
// -- identifiers with "_", not with "-", so we use pg_collation instead.
// -- https://www.postgresql.org/docs/current/infoschema-collations.html
// -- https://www.postgresql.org/docs/current/catalog-pg-collation.html
// CREATE OR REPLACE FUNCTION "${opt.schema}".is_bcp_47_tag(
// 	input TEXT
// )
// RETURNS BOOLEAN
// AS $$
// 	SELECT EXISTS (
// 		SELECT collctype
// 		FROM pg_collation
// 		WHERE collctype = input
// 		OR collname = input
// 		OR collname = input || '-x-icu'
// 		LIMIT 1
// 	);
// $$ language sql STABLE;

// ${opt.postgraphile ? `\
// COMMENT ON FUNCTION "${opt.schema}".is_bcp_47_tag IS E'@omit';
// ` : ''}

// CREATE OR REPLACE FUNCTION "${opt.schema}".is_valid_lang_code(
// 	input TEXT
// )
// RETURNS BOOLEAN
// AS $$
// 	SELECT "${opt.schema}".is_bcp_47_tag(
// 		${opt.lowerCaseLanguageCodes ? `lower(input)` : `input`}
// 	);
// $$ language sql STABLE;

// `,
// }

const valid_timezones = async (db, opt) => {
	// DuckDB v0.10: "subqueries prohibited in CHECK constraints"
	// > CONSTRAINT valid_timezone CHECK ("${opt.schema}".is_timezone(agency_timezone))
	// or inlined:
	// > CONSTRAINT valid_timezone CHECK (EXISTS(SELECT name FROM pg_timezone_names() WHERE name = agency_timezone))
	// so we create a helper table instead
	await db[RUN](`\
CREATE TABLE "${opt.schema}".valid_timezones(
	tz TEXT PRIMARY KEY
);
INSERT INTO "${opt.schema}".valid_timezones (
	SELECT name AS tz
	FROM pg_timezone_names()
);
`)
}

// const shape_exists = {
// 	beforeAll: (opt) => `\
// CREATE OR REPLACE FUNCTION "${opt.schema}".shape_exists(
// 	some_shape_id TEXT
// )
// RETURNS BOOLEAN
// AS $$
// 	SELECT EXISTS (
// 		SELECT shape_id
// 		FROM "${opt.schema}".shapes
// 		WHERE shape_id = some_shape_id
// 		LIMIT 1
// 	);
// $$ language sql STABLE;

// `,
// }

module.exports = {
	icu,
	// is_valid_lang_code,
	valid_timezones,
	// shape_exists,
}
