'use strict'

const {fail} = require('assert')
const RUN = require('./run.js')

const createStatsActiveTripsByHourView = async (db, _, opt) => {
	let materialized = false
	if (opt.statsActiveTripsByHour === 'materialized-view') {
		// todo: support it once DuckDB supports materialized views
		// see also https://github.com/duckdb/duckdb/discussions/3638
		fail('opt.statsActiveTripsByHour: materialized-view is currently not supported')
		// materialized = true
	} else if (opt.statsActiveTripsByHour !== 'view') {
		throw new Error('invalid opt.statsActiveTripsByHour, must be one of these: none, view, materialized-view.')
	}
	// todo: not supported by duckdb?!
	// https://github.com/duckdb/duckdb/discussions/3638
	const createViewCmd = materialized
		? `CREATE MATERIALIZED VIEW`
		: `CREATE OR REPLACE VIEW`

	await db[RUN](`\
-- todo: use materialized view once DuckDB supports that
-- see also https://github.com/duckdb/duckdb/discussions/3638
CREATE TABLE feed_time_frame AS
WITH
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	dates AS (
		SELECT
			min("date") AS min,
			max("date") AS max
		FROM service_days
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	date_offset AS (
		SELECT
			largest AS o
		FROM largest_arr_dep_time
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	date_min_max AS (
		SELECT
			date_trunc('day', min + o) AS min,
			date_trunc('day', max - o) AS max
		FROM dates, date_offset 
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	min_dep AS (
		SELECT min("t_departure") AS t
		FROM arrivals_departures, date_min_max
		WHERE date <= (SELECT min FROM date_min_max)
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	min_arr AS (
		SELECT min("t_arrival") AS t
		FROM arrivals_departures, date_min_max
		WHERE date <= (SELECT min FROM date_min_max)
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
	max_dep AS (
		SELECT min("t_departure") AS t
		FROM arrivals_departures, date_min_max
		WHERE date >= (SELECT max FROM date_min_max)
	),
	-- todo: explicitly specify if we want materialization!
	-- see also https://github.com/duckdb/duckdb/pull/17459
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
	time_unit
)
AS (
	SELECT
		generate_series(
			date_trunc(time_unit, min),
			date_trunc(time_unit, max),
			('1 ' || time_unit)::interval
		) as t
	FROM feed_time_frame
);

${createViewCmd} stats_active_trips_by_hour AS
WITH
	all_hours AS NOT MATERIALIZED (
		SELECT unnest(feed_time_series('hour')) AS "hour"
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
`)

	if (materialized) {
		await db[RUN](`\
CREATE INDEX ON stats_active_trips_by_hour ("hour");
`)
	}
}
createStatsActiveTripsByHourView.runDespiteMissingSrcFile = true

module.exports = createStatsActiveTripsByHourView
