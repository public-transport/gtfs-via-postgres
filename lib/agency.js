'use strict'

const DEFAULT_AGENCY_ID = 'default-agency'

// https://gtfs.org/schedule/reference/#agencytxt
const beforeAll = (opt) => `\
CREATE TABLE "${opt.schema}".agency (
	agency_id TEXT PRIMARY KEY,
	agency_name TEXT NOT NULL,
	agency_url TEXT NOT NULL,
	agency_timezone TEXT NOT NULL
		CONSTRAINT valid_timezone CHECK ("${opt.schema}".is_timezone(agency_timezone)),
	agency_lang TEXT, -- todo: validate?
	agency_phone TEXT,
	agency_fare_url TEXT,
	agency_email TEXT
);

COPY "${opt.schema}".agency (
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

const afterAll = (opt, workingState) => {
	let sql = `\
\\.
`

	if (workingState.insertDefaultAgency) {
		sql += `\
INSERT INTO "${opt.schema}".agency (
	agency_id,
	agency_name,
	agency_url,
	agency_timezone
) VALUES (
	'${DEFAULT_AGENCY_ID}',
	'implicit default agency, the CSV file doesn\\'t contain one',
	'http://example.org',
	'${opt.defaultTimezone}'
);
`
	}

	return sql
}

module.exports = {
	DEFAULT_AGENCY_ID,
	beforeAll,
	formatRow: formatAgencyRow,
	afterAll,
}
