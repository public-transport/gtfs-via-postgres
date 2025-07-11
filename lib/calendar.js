'use strict'

// https://gtfs.org/documentation/schedule/reference/#calendartxt
const beforeAll = (opt) => `\
CREATE TYPE availability AS ENUM (
	'not_available' -- 0 – Service is not available for Mondays in the date range.
	, 'available' -- 1 – Service is available for all Mondays in the date range.
);
CREATE CAST (availability AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE calendar (
	service_id TEXT PRIMARY KEY,
	monday availability NOT NULL,
	tuesday availability NOT NULL,
	wednesday availability NOT NULL,
	thursday availability NOT NULL,
	friday availability NOT NULL,
	saturday availability NOT NULL,
	sunday availability NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL
);

COPY calendar (
	service_id,
	monday,
	tuesday,
	wednesday,
	thursday,
	friday,
	saturday,
	sunday,
	start_date,
	end_date
) FROM STDIN csv;
`

const availability = (val) => {
	if (val === '0') return 'not_available'
	if (val === '1') return 'available'
	throw new Error('invalid availability: ' + val)
}

const formatCalendarRow = (c) => {
	return [
		c.service_id || null,
		c.monday ? availability(c.monday) : null,
		c.tuesday ? availability(c.tuesday) : null,
		c.wednesday ? availability(c.wednesday) : null,
		c.thursday ? availability(c.thursday) : null,
		c.friday ? availability(c.friday) : null,
		c.saturday ? availability(c.saturday) : null,
		c.sunday ? availability(c.sunday) : null,
		c.start_date,
		c.end_date,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatCalendarRow,
	afterAll,
}
