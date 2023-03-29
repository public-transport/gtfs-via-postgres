BEGIN;
CREATE TEMP TABLE _benchmark (
	query TEXT,
	avg FLOAT,
	min FLOAT,
	p25 FLOAT,
	p50 FLOAT,
	p75 FLOAT,
	p95 FLOAT,
	p99 FLOAT,
	max FLOAT,
	iterations INTEGER
);

-- slightly modified from "How to benchmark PostgreSQL queries well"
-- https://www.tangramvision.com/blog/how-to-benchmark-postgresql-queries-well#sql-function-with-clock_timestamp
CREATE OR REPLACE FUNCTION bench(_query TEXT, _iterations INTEGER = 100)
RETURNS void
AS $$
DECLARE
	_start TIMESTAMPTZ;
	_end TIMESTAMPTZ;
	_delta DOUBLE PRECISION;
BEGIN
	CREATE TEMP TABLE IF NOT EXISTS _bench_results (
		elapsed DOUBLE PRECISION
	);

	-- Warm the cache
	FOR i IN 1..10 LOOP
		EXECUTE _query;
	END LOOP;

	FOR i IN 1.._iterations LOOP
		_start = clock_timestamp();
		EXECUTE _query;
		_end = clock_timestamp();
		_delta = 1000 * (extract(epoch from _end) - extract(epoch from _start));
		INSERT INTO _bench_results VALUES (_delta);
	END LOOP;

	INSERT INTO _benchmark
	SELECT
		_query,
		round(avg(elapsed)::numeric, 0),
		min(elapsed),
		round((percentile_cont(0.25) WITHIN GROUP (ORDER BY elapsed))::numeric, 0),
		round((percentile_cont(0.50) WITHIN GROUP (ORDER BY elapsed))::numeric, 0),
		round((percentile_cont(0.75) WITHIN GROUP (ORDER BY elapsed))::numeric, 0),
		round((percentile_cont(0.95) WITHIN GROUP (ORDER BY elapsed))::numeric, 0),
		round((percentile_cont(0.99) WITHIN GROUP (ORDER BY elapsed))::numeric, 0),
		max(elapsed),
		_iterations
	FROM _bench_results;

	DROP TABLE _bench_results;
END
$$
LANGUAGE plpgsql;

\i stops_by_distance.sql
\i arrs_deps_by_route_name_and_time.sql
\i arrs_deps_by_station_and_time.sql
\i arrs_deps_by_station_and_time_seq_0.sql
\i arrs_deps_by_stop_and_time.sql
\i arrs_deps_by_trip_and_date.sql
\i arrs_deps_by_stop.sql
\i arrs_deps_by_non_existent_stop.sql
\i arrs_deps_by_time.sql
\i arrs_deps_by_time_manual.sql
\i connections_by_route_name_and_time.sql
\i connections_by_station_and_time.sql
\i connections_by_station_and_time_seq_0.sql
\i connections_by_stop_and_time.sql
\i connections_by_trip_and_date.sql
\i connections_by_stop.sql
\i connections_by_non_existent_stop.sql
\i connections_by_time.sql
\i connections_by_time_manual.sql
\i stats_by_route_id_and_date.sql

SELECT * FROM _benchmark;

ROLLBACK;
