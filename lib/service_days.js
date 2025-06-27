'use strict'

const RUN = require('./run.js')

// https://gtfs.org/documentation/schedule/reference/#calendar_datestxt
const importData = async (db, _, opt, workingState) => {
	await db[RUN](`\
-- DuckDB currently has no materialized views, only tables.
-- see https://github.com/duckdb/duckdb/discussions/3638#discussioncomment-2801284
-- todo: what if i modify calendar/calendar_dates? define triggers?
-- todo [breaking]: rename to service_dates?
CREATE TABLE service_days (
	service_id TEXT NOT NULL,
	date TIMESTAMP NOT NULL,
	PRIMARY KEY (service_id, date)
);

INSERT INTO service_days 
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
			date_part('dow', "date") dow,
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
				unnest(generate_series(
					start_date::TIMESTAMP,
					end_date::TIMESTAMP,
					'1 day'::INTERVAL
				)) "date"
			FROM calendar
		) all_days_raw
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

ORDER BY service_id, "date";

CREATE UNIQUE INDEX service_days_unique_service_id_date ON service_days (service_id, date);

CREATE INDEX service_days_service_id ON service_days (service_id);
CREATE INDEX service_days_date ON service_days (date);
-- apparently the unique index (service_id, date) doesn't speed up queries
CREATE INDEX service_days_service_id_date ON service_days (service_id, date);
`)
}

importData.runDespiteMissingSrcFile = true

module.exports = importData
