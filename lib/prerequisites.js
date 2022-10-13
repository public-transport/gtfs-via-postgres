'use strict'

const is_bcp_47_code = {
	beforeAll: (opt) => `\
-- Unfortunately information_schema.collations.collation_name only has
-- identifiers with "_", not with "-", so we use pg_collation instead.
-- https://www.postgresql.org/docs/current/infoschema-collations.html
-- https://www.postgresql.org/docs/current/catalog-pg-collation.html
CREATE OR REPLACE FUNCTION "${opt.schema}".is_bcp_47_code(
	input TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT collctype
		FROM pg_collation
		WHERE collctype = input
		OR collname = input
		OR collname = input || '-x-icu'
		LIMIT 1
	);
$$ language sql STABLE;

${opt.postgraphile ? `\
COMMENT ON FUNCTION "${opt.schema}".is_bcp_47_code IS E'@omit';
` : ''}
`,
}
const is_timezone = {
	beforeAll: (opt) => `\
-- https://justatheory.com/2007/11/postgres-timezone-validation/
CREATE OR REPLACE FUNCTION "${opt.schema}".is_timezone(
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

${opt.postgraphile ? `\
COMMENT ON FUNCTION "${opt.schema}".is_timezone IS E'@omit';
` : ''}
`,
}
const shape_exists = {
	beforeAll: (opt) => `\
CREATE OR REPLACE FUNCTION "${opt.schema}".shape_exists(
	some_shape_id TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT shape_id
		FROM "${opt.schema}".shapes
		WHERE shape_id = some_shape_id
		LIMIT 1
	);
$$ language sql STABLE;

${opt.postgraphile ? `\
COMMENT ON FUNCTION "${opt.schema}".shape_exists IS E'@omit';
` : ''}
`,
}

module.exports = {
	is_bcp_47_code,
	is_timezone,
	shape_exists,
}
