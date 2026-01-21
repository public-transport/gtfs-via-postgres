CREATE TABLE stops (
	stop_id TEXT PRIMARY KEY,
	parent_station TEXT,
	-- In stops.txt, *any* row's parent_station might reference *any* other row. Essentially, stops.txt describes a tree.
	-- As of DuckDB v1.0.0, it *seems* like adding a foreign key constraint here doesn't work, even if we order the stops to put parents before their children (see below).
	-- todo: Report this with DuckDB? Alternatively, add the constraint after the import (see below).
	-- maybe related? https://github.com/duckdb/duckdb/issues/10574
	-- FOREIGN KEY (parent_station) REFERENCES stops,
);

INSERT INTO stops
BY NAME
WITH RECURSIVE
	stops AS (
		SELECT *
		FROM read_csv('stops.txt', header = true, all_varchar = true)
	),
	-- order the stops to put parents before their children
	stops_sorted_by_parents AS (
		(
			SELECT
				*,
				stop_id AS root_id,
				1 AS recursion_level
			FROM stops
			WHERE parent_station IS NULL
		)
		UNION ALL
		(
			SELECT
				children.*,
				parent.root_id,
				parent.recursion_level + 1
			FROM stops children
			JOIN stops_sorted_by_parents parent ON parent.stop_id = children.parent_station
		)
	)
SELECT * EXCLUDE (
	-- omit sorting helper columns
	root_id,
	recursion_level
)
FROM stops_sorted_by_parents
ORDER BY root_id, recursion_level, stop_id;

CREATE UNIQUE INDEX stops_stop_id ON stops(stop_id);

SELECT * FROM stops;

CREATE TABLE stop_times (
	trip_id TEXT NOT NULL,
	-- https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES stops(stop_id)
);

INSERT INTO stop_times
BY NAME
SELECT *
FROM read_csv('stop_times.txt', header = true, all_varchar = true);
