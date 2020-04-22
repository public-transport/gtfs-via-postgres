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
	${e.date},
	${e.exception_type ? exceptionType(e.exception_type) : null}
)`
}

const head = `\
INSERT INTO calendar_dates (
	service_id,
	date,
	exception_type
) VALUES`

const afterAll = `\
CREATE INDEX ON calendar_dates (exception_type);

CREATE VIEW service_days AS
SELECT *
FROM (
	SELECT
		base_days.service_id,
		base_days.date

	-- "base" service days
	FROM (
		SELECT
			service_id,
			"date"
		FROM (
			SELECT
				service_id,
				"date",
				extract(dow FROM "date") dow,
				sunday,
				monday,
				tuesday,
				wednesday,
				thursday,
				friday,
				saturday
			FROM (
				SELECT
					*,
					generate_series (
						start_date::TIMESTAMP,
						end_date::TIMESTAMP,
						'1 day'::INTERVAL
					) "date"
				FROM calendar
			) foo
		) all_days
		WHERE (sunday = 'available' AND dow = 0)
		OR (monday = 'available' AND dow = 1)
		OR (tuesday = 'available' AND dow = 2)
		OR (wednesday = 'available' AND dow = 3)
		OR (thursday = 'available' AND dow = 4)
		OR (friday = 'available' AND dow = 5)
		OR (saturday = 'available' AND dow = 6)
	) base_days

	-- "removed" exceptions
	LEFT JOIN (
		SELECT *
		FROM calendar_dates
		WHERE exception_type = 'removed'
	) removed
	ON base_days.service_id = removed.service_id
	AND base_days.date = removed.date
	WHERE removed.date IS NULL

	-- "added" exceptions
	UNION SELECT service_id, "date"
	FROM calendar_dates
	WHERE exception_type = 'added'
) service_days
ORDER BY service_id, "date";
`

module.exports = {
	beforeAll,
	head,
	formatRow: formatCalendarDatesRow,
	afterAll,
}
