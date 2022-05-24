'use strict'

// https://developers.google.com/transit/gtfs/reference#calendar_datestxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".exception_type_v AS ENUM (
	'added' -- 1 – Service has been added for the specified date.
	, 'removed' -- 2 – Service has been removed for the specified date.
);

CREATE TABLE "${opt.schema}".calendar_dates (
	service_id TEXT NOT NULL,
	"date" DATE NOT NULL,
	exception_type "${opt.schema}".exception_type_v NOT NULL
);

COPY "${opt.schema}".calendar_dates (
	service_id,
	date,
	exception_type
) FROM STDIN csv;
`

const exceptionType = (val) => {
	if (val === '1') return 'added'
	if (val === '2') return 'removed'
	throw new Error('invalid exception_type: ' + val)
}

const formatCalendarDatesRow = (e) => {
	return [
		e.service_id || null,
		e.date,
		e.exception_type ? exceptionType(e.exception_type) : null,
	]
}

const afterAll = (opt) => `\
\\.

CREATE INDEX ON "${opt.schema}".calendar_dates (exception_type);
`

module.exports = {
	beforeAll,
	formatRow: formatCalendarDatesRow,
	afterAll,
}
