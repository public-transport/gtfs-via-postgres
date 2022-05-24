'use strict'

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
`,
}

module.exports = {
	is_timezone,
	shape_exists,
}
