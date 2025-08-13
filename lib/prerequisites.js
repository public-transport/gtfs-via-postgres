'use strict'

const RUN = require('./run.js')

const valid_lang_codes = async (db, _, opt) => {
	await db[RUN](`\
INSTALL icu; -- todo: make install optional?
LOAD icu;

-- todo: once https://github.com/MobilityData/gtfs-validator/issues/1987 is solved, adapt this code
-- Unfortunately pragma_collations().collname only has
-- identifiers with "_", not with "-", so we use pg_collation instead.
-- see also https://duckdb.org/docs/sql/expressions/collations#icu-collations
-- todo: Also, entries like "de_DE" are missing.
CREATE TABLE valid_lang_codes (
	-- As of DuckDB v1.2.0, referring to this table via either a subquery or a plain foreign key doesn't work because
	-- - subqueries are prohibited in CHECK constraints, and
	-- - the foreign key doesn't seem to work with a NOCASE primary key.
	-- This is why we use a case-sensitive primary key and unnest() to enumerate all (relevant) casings ourselves.
	lang_code TEXT PRIMARY KEY,
);
INSERT INTO valid_lang_codes
SELECT *
FROM (
	SELECT
		unnest([
			collname,
			CASE WHEN contains(collname, '-') THEN
				concat_ws('-', split_part(collname, '-', 1), upper(split_part(collname, '-', 2)))
			ELSE
				NULL
			END
		]) AS lang_code
	FROM (
		SELECT
			replace(collname, '_', '-') AS collname
		FROM pragma_collations()
	) t
) t
WHERE lang_code IS NOT NULL;
`)
}
valid_lang_codes.runDespiteMissingSrcFile = true

const valid_timezones = async (db, _, opt) => {
	// DuckDB v0.10: "subqueries prohibited in CHECK constraints"
	// > CONSTRAINT valid_timezone CHECK (is_timezone(agency_timezone))
	// or inlined:
	// > CONSTRAINT valid_timezone CHECK (EXISTS(SELECT name FROM pg_timezone_names() WHERE name = agency_timezone))
	// so we create a helper table instead
	await db[RUN](`\
INSTALL icu; -- todo: make install optional?
LOAD icu;

CREATE TABLE valid_timezones(
	tz TEXT PRIMARY KEY
);
INSERT INTO valid_timezones (
	SELECT name AS tz
	FROM pg_timezone_names()
);
`)
}
valid_timezones.runDespiteMissingSrcFile = true

module.exports = {
	valid_lang_codes,
	valid_timezones,
}
