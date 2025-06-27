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
CREATE MATERIALIZED VIEW feed_time_frame AS
WITH
	dates AS (
		SELECT
			min("date") AS min,
			max("date") AS max
		FROM service_days
	),
	date_offset AS (
		SELECT greatest(
			largest_arrival_time(),
			largest_departure_time()
		) AS o
	),
	date_min_max AS (
		SELECT
			date_trunc('day', min + o) AS min,
			date_trunc('day', max - o) AS max
		FROM dates, date_offset 
	),
	min_dep AS (
		SELECT min("t_departure") AS t
		FROM arrivals_departures, date_min_max
		WHERE date <= (SELECT min FROM date_min_max)
	),
	min_arr AS (
		SELECT min("t_arrival") AS t
		FROM arrivals_departures, date_min_max
		WHERE date <= (SELECT min FROM date_min_max)
	),
	max_dep AS (
		SELECT min("t_departure") AS t
		FROM arrivals_departures, date_min_max
		WHERE date >= (SELECT max FROM date_min_max)
	),
	max_arr AS (
		SELECT min("t_arrival") AS t
		FROM arrivals_departures, date_min_max
		WHERE date >= (SELECT max FROM date_min_max)
	)
SELECT
	least(min_dep.t, min_arr.t) as min,
	least(max_dep.t, max_arr.t) as max
FROM min_dep, min_arr, max_dep, max_arr;

CREATE OR REPLACE FUNCTION feed_time_series(
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
	FROM feed_time_frame
$$ LANGUAGE sql STABLE;

${createViewCmd} stats_active_trips_by_hour AS
WITH
	all_hours AS NOT MATERIALIZED (
		SELECT feed_time_series('hour') AS "hour"
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
		LEFT JOIN connections ON (
			date_trunc('hour', t_departure) <= "hour"
			AND date_trunc('hour', t_arrival) >= "hour"	
		)
	) t
) cons;

${materialized ? `\
CREATE INDEX ON stats_active_trips_by_hour ("hour");
` : ''}
`
}

module.exports = {
	afterAll,
}
