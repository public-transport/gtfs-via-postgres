'use strict'

const RUN = require('./run.js')

const valid_lang_codes = async (db, _, opt) => {
	await db[RUN](`\
INSTALL icu; -- todo: make install optional?
LOAD icu;

-- Unfortunately pragma_collations().collname only has
-- identifiers with "_", not with "-", so we use pg_collation instead.
-- see also https://duckdb.org/docs/sql/expressions/collations#icu-collations
-- todo: Also, entries like "de_DE" are missing.
CREATE TABLE "${opt.schema}".valid_lang_codes (
	lang_code TEXT PRIMARY KEY COLLATE NOCASE,
);
INSERT INTO "${opt.schema}".valid_lang_codes
SELECT
	replace(collname, '_', '-') AS lang_code
FROM pragma_collations();
`)
}

const valid_timezones = async (db, _, opt) => {
	// DuckDB v0.10: "subqueries prohibited in CHECK constraints"
	// > CONSTRAINT valid_timezone CHECK ("${opt.schema}".is_timezone(agency_timezone))
	// or inlined:
	// > CONSTRAINT valid_timezone CHECK (EXISTS(SELECT name FROM pg_timezone_names() WHERE name = agency_timezone))
	// so we create a helper table instead
	await db[RUN](`\
INSTALL icu; -- todo: make install optional?
LOAD icu;

CREATE TABLE "${opt.schema}".valid_timezones(
	tz TEXT PRIMARY KEY
);
INSERT INTO "${opt.schema}".valid_timezones (
	SELECT name AS tz
	FROM pg_timezone_names()
);
`)
}

module.exports = {
	valid_lang_codes,
	valid_timezones,
}
