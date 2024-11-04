BEGIN;
CREATE TEMP TABLE _benchmark (
	dbname TEXT,
	filename TEXT,
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
CREATE OR REPLACE FUNCTION bench(_filename TEXT, _query TEXT, _iterations INTEGER)
RETURNS void
AS $$
DECLARE
	_warmup_iterations INTEGER;
	_start TIMESTAMPTZ;
	_end TIMESTAMPTZ;
	_delta DOUBLE PRECISION;
BEGIN
	CREATE TEMP TABLE IF NOT EXISTS _bench_results (
		elapsed DOUBLE PRECISION
	);

	-- Warm the cache
	_warmup_iterations = GREATEST(3, _iterations / 10);
	FOR i IN 1.._warmup_iterations LOOP
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
		current_database() AS dbname,
		_filename,
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

-- We aim for ~4s per benchmark, but take more time for slow benchmarks.
-- Apple Silicon M2, most queries seem to be single-threaded.
\set query `cat arrs_deps_by_non_existent_stop.sql`
SELECT bench('arrs_deps_by_non_existent_stop.sql', :'query', 500);
\set query `cat arrs_deps_by_route_name_and_time.sql`
SELECT bench('arrs_deps_by_route_name_and_time.sql', :'query', 90);
\set query `cat arrs_deps_by_station_and_time.sql`
SELECT bench('arrs_deps_by_station_and_time.sql', :'query', 170);
\set query `cat arrs_deps_by_station_and_time_seq_0.sql`
SELECT bench('arrs_deps_by_station_and_time_seq_0.sql', :'query', 500);
\set query `cat arrs_deps_by_stop.sql`
SELECT bench('arrs_deps_by_stop.sql', :'query', 50);
\set query `cat arrs_deps_by_stop_and_time.sql`
SELECT bench('arrs_deps_by_stop_and_time.sql', :'query', 400);
\set query `cat arrs_deps_by_time.sql`
SELECT bench('arrs_deps_by_time.sql', :'query', 5);
\set query `cat arrs_deps_by_time_manual.sql`
SELECT bench('arrs_deps_by_time_manual.sql', :'query', 5);
\set query `cat arrs_deps_by_trip_and_date.sql`
SELECT bench('arrs_deps_by_trip_and_date.sql', :'query', 500);
\set query `cat connections_by_non_existent_stop.sql`
SELECT bench('connections_by_non_existent_stop.sql', :'query', 500);
\set query `cat connections_by_route_name_and_time.sql`
SELECT bench('connections_by_route_name_and_time.sql', :'query', 20);
\set query `cat connections_by_station_and_time.sql`
SELECT bench('connections_by_station_and_time.sql', :'query', 50);
\set query `cat connections_by_station_and_time_seq_0.sql`
SELECT bench('connections_by_station_and_time_seq_0.sql', :'query', 300);
\set query `cat connections_by_stop.sql`
SELECT bench('connections_by_stop.sql', :'query', 40);
\set query `cat connections_by_stop_and_time.sql`
SELECT bench('connections_by_stop_and_time.sql', :'query', 200);
\set query `cat connections_by_time.sql`
SELECT bench('connections_by_time.sql', :'query', 3);
\set query `cat connections_by_time_manual.sql`
SELECT bench('connections_by_time_manual.sql', :'query', 3);
\set query `cat connections_by_trip_and_date.sql`
SELECT bench('connections_by_trip_and_date.sql', :'query', 500);
\set query `cat stats_by_route_date.sql`
SELECT bench('stats_by_route_date.sql', :'query', 5);
\set query `cat stops_by_distance.sql`
SELECT bench('stops_by_distance.sql', :'query', 170);

SELECT * FROM _benchmark;

ROLLBACK;
