'use strict'

const is_timezone = {
	beforeAll: `\
-- https://justatheory.com/2007/11/postgres-timezone-validation/
CREATE FUNCTION is_timezone(
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

module.exports = {
	is_timezone,
}
