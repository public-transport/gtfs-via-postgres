'use strict'

// https://developers.google.com/transit/gtfs/reference#agencytxt
const beforeAll = `\
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

CREATE TABLE agency (
	agency_id TEXT PRIMARY KEY,
	agency_name TEXT NOT NULL,
	agency_url TEXT NOT NULL,
	agency_timezone TEXT NOT NULL
		CONSTRAINT valid_timezone CHECK (is_timezone(agency_timezone)),
	agency_lang TEXT, -- todo: validate?
	agency_phone TEXT,
	agency_fare_url TEXT,
	agency_email TEXT
);

COPY agency (
	agency_id,
	agency_name,
	agency_url,
	agency_timezone,
	agency_lang,
	agency_phone,
	agency_fare_url,
	agency_email
) FROM STDIN csv;
`

const formatAgencyRow = (a) => {
	return [
		a.agency_id || null,
		a.agency_name || null,
		a.agency_url || null,
		a.agency_timezone || null,
		a.agency_lang || null,
		a.agency_phone || null,
		a.agency_fare_url || null,
		a.agency_email || null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatAgencyRow,
	afterAll,
}
