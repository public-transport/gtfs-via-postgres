'use strict'

const is_valid_lang_code = {
	beforeAll: (opt) => `\
-- Unfortunately information_schema.collations.collation_name only has
-- identifiers with "_", not with "-", so we use pg_collation instead.
-- https://www.postgresql.org/docs/current/infoschema-collations.html
-- https://www.postgresql.org/docs/current/catalog-pg-collation.html
-- todo [breaking]: rename to e.g. is_similar_to_bcp_47_tag?
CREATE OR REPLACE FUNCTION is_bcp_47_tag(
	input TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT collctype
		FROM pg_collation
		WHERE ${opt.lowerCaseLanguageCodes ? `lower(collctype)` : `collctype`} = ${opt.lowerCaseLanguageCodes ? `lower(input)` : `input`}
		OR ${opt.lowerCaseLanguageCodes ? `lower(collname)` : `collname`} = ${opt.lowerCaseLanguageCodes ? `lower(input)` : `input`}
		OR ${opt.lowerCaseLanguageCodes ? `lower(collname)` : `collname`} = ${opt.lowerCaseLanguageCodes ? `lower(input)` : `input`} || '-x-icu'
		LIMIT 1
	);
$$ language sql STABLE;

-- todo [breaking]: remove
CREATE OR REPLACE FUNCTION is_valid_lang_code(
	input TEXT
)
RETURNS BOOLEAN
AS $$
	-- todo: see also https://github.com/MobilityData/gtfs-validator/issues/1987
	SELECT is_bcp_47_tag(input);
$$ language sql STABLE;

`,
}
const is_timezone = {
	beforeAll: (opt) => `\
-- https://justatheory.com/2007/11/postgres-timezone-validation/
CREATE OR REPLACE FUNCTION is_timezone(
	tz TEXT
)
RETURNS BOOLEAN
AS $$
	DECLARE
	    date TIMESTAMPTZ;
	BEGIN
	    date := now() AT TIME ZONE tz;
	    RETURN TRUE;
	EXCEPTION WHEN invalid_parameter_value THEN
	    RETURN FALSE;
	END;
$$ language plpgsql STABLE;

`,
}
const shape_exists = {
	beforeAll: (opt) => `\
CREATE OR REPLACE FUNCTION shape_exists(
	some_shape_id TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT shape_id
		FROM shapes
		WHERE shape_id = some_shape_id
		LIMIT 1
	);
$$ language sql STABLE;

`,
}

module.exports = {
	is_valid_lang_code,
	is_timezone,
	shape_exists,
}
