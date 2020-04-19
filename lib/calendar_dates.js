'use strict'

// https://developers.google.com/transit/gtfs/reference#calendar_datestxt
const beforeAll = `\
CREATE TYPE exception_type_v AS ENUM (
	'added' -- 1 – Service has been added for the specified date.
	, 'removed' -- 2 – Service has been removed for the specified date.
);

CREATE TABLE calendar_dates (
	service_id TEXT NOT NULL,
	FOREIGN KEY (service_id) REFERENCES calendar,
	"date" DATE NOT NULL,
	exception_type exception_type_v NOT NULL
);
`

const exceptionType = (val) => {
	if (val === '1') return 'added'
	if (val === '2') return 'removed'
	throw new Error('invalid exception_type: ' + val)
}

const formatCalendarDatesRow = (sql, e) => {
	return sql `\
(
	${e.service_id || null},
	${e.date}, -- todo
	${e.exception_type ? exceptionType(e.exception_type) : null}
)`
}

const head = `\
INSERT INTO calendar_dates (
	service_id,
	date,
	exception_type
) VALUES`

module.exports = {
	beforeAll,
	head,
	formatRow: formatCalendarDatesRow,
}
