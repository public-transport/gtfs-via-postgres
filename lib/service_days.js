'use strict'

const afterAll = (opt) => `\
-- todo [breaking]: rename to service_dates?
CREATE MATERIALIZED VIEW "${opt.schema}".service_days AS
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
			FROM "${opt.schema}".calendar
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
	FROM "${opt.schema}".calendar_dates
	WHERE exception_type = 'removed'
) removed
ON base_days.service_id = removed.service_id
AND base_days.date = removed.date
WHERE removed.date IS NULL

-- "added" exceptions
UNION SELECT service_id, "date"
FROM "${opt.schema}".calendar_dates
WHERE exception_type = 'added'

ORDER BY service_id, "date";

CREATE UNIQUE INDEX ON service_days (service_id, date);

CREATE INDEX ON "${opt.schema}".service_days (service_id);
CREATE INDEX ON "${opt.schema}".service_days (date);

${opt.postgraphile ? `\
COMMENT ON MATERIALIZED VIEW "${opt.schema}".service_days IS E'@name serviceDates\\n@primaryKey service_id,date';
` : ''}
`

module.exports = {
	afterAll,
}
