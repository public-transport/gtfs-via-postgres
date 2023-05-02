'use strict'

const afterAll = (opt) => {
	let materialized = false
	if (opt.statsActiveTripsByHour === 'materialized-view') {
		materialized = true
	} else if (opt.statsActiveTripsByHour !== 'view') {
		throw new Error('invalid opt.statsActiveTripsByHour, must be one of these: none, view, materialized-view.')
	}
	const createViewCmd = materialized
		? `CREATE MATERIALIZED VIEW`
		: `CREATE OR REPLACE VIEW`

	return `\
CREATE MATERIALIZED VIEW "${opt.schema}".feed_time_frame AS
WITH
	dates AS (
		SELECT
			min("date") AS min,
			max("date") AS max
		FROM "${opt.schema}".service_days
	),
	date_offset AS (
		SELECT greatest(
			"${opt.schema}".largest_arrival_time(),
			"${opt.schema}".largest_departure_time()
		) AS o
	),
	date_min_max AS (
		SELECT
			date_trunc('day', min + o) AS min,
			date_trunc('day', max - o) AS max
		FROM dates, date_offset 
	),
	min_dep AS (
		SELECT t_departure AS t
		FROM "${opt.schema}".arrivals_departures, date_min_max
		WHERE date <= date_min_max.min
		ORDER BY t_departure ASC
		LIMIT 1
	),
	min_arr AS (
		SELECT t_arrival AS t
		FROM "${opt.schema}".arrivals_departures, date_min_max
		WHERE date <= date_min_max.min
		ORDER BY t_arrival ASC
		LIMIT 1
	),
	max_dep AS (
		SELECT t_departure AS t
		FROM "${opt.schema}".arrivals_departures, date_min_max
		WHERE date >= date_min_max.max
		ORDER BY t_departure DESC
		LIMIT 1
	),
	max_arr AS (
		SELECT t_arrival AS t
		FROM "${opt.schema}".arrivals_departures, date_min_max
		WHERE date >= date_min_max.max
		ORDER BY t_arrival DESC
		LIMIT 1
	)
SELECT
	least(min_dep.t, min_arr.t) as min,
	least(max_dep.t, max_arr.t) as max
FROM min_dep, min_arr, max_dep, max_arr;

CREATE OR REPLACE FUNCTION "${opt.schema}".feed_time_series(
	time_unit TEXT
)
RETURNS SETOF timestamptz
AS $$
	SELECT
		generate_series(
			date_trunc(time_unit, min),
			date_trunc(time_unit, max),
			('1 ' || time_unit)::interval
		) as t
	FROM "${opt.schema}".feed_time_frame
$$ LANGUAGE sql STABLE;

${createViewCmd} "${opt.schema}".stats_active_trips_by_hour AS
WITH
	all_hours AS NOT MATERIALIZED (
		SELECT "${opt.schema}".feed_time_series('hour') AS "hour"
	)
SELECT DISTINCT ON ("hour")
	"hour",
	count(*) OVER (PARTITION BY "hour") as nr_of_active_trips
FROM (
	-- only keep one arrival/departure per trip
	SELECT DISTINCT ON ("hour", route_id, trip_id)
		*
	FROM (
		SELECT *
		FROM all_hours
		LEFT JOIN "${opt.schema}".connections ON (
			date_trunc('hour', t_departure) <= "hour"
			AND date_trunc('hour', t_arrival) >= "hour"	
		)
	) t
) cons;

${materialized ? `\
CREATE INDEX ON "${opt.schema}".stats_active_trips_by_hour ("hour");
` : ''}

${opt.postgraphile ? `\
COMMENT ON${materialized ? ' MATERIALIZED' : ''} VIEW "${opt.schema}".stats_active_trips_by_hour IS E'@name hourlyActiveTripsStats\\n@primaryKey hour';
` : ''}
`
}

module.exports = {
	afterAll,
}
