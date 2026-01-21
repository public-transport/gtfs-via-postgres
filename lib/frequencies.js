'use strict'

const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')
const {queryNumberOfRows} = require('./rows-count.js')
const {duckdbReadCsvAutodetectionSampleSize} = require('./csv.js')

// https://gtfs.org/documentation/schedule/reference/#frequenciestxt
const importData = async (db, pathToFrequencies, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);
-- CREATE CAST (exact_times_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE frequencies (
	-- Used to implement arrivals_departures & connections. Filled by the INSERT below.
	frequencies_row INTEGER,
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	start_time INTERVAL NOT NULL,
	-- todo, once supported by DuckDB: PRIMARY KEY (trip_id, start_time)
	end_time INTERVAL NOT NULL,
	headway_secs INT NOT NULL,
	exact_times exact_times_v -- todo: NOT NULL & ifnull()
	-- frequencies' primary is just (trip_id, start_time). however, the definition for the headway_secs field says:
	-- > Multiple headways may be defined for the same trip, but must not overlap. New headways may start at the exact time the previous headway ends.
	-- https://gtfs.org/documentation/schedule/reference/#frequenciestxt
	-- todo: add a unique constraint once there is consensus in https://github.com/google/transit/issues/514
);
`)

	if (pathToFrequencies === null) {
		// todo: keep?
		// workingState.nrOfRowsByName.set('frequencies', 0n)
		return;
	}

	// exact_times is optional, so the entire columns can be missing.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// todo: github ticket?
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		exact_times: has_exact_times,
	} = await queryIfColumnsExist(db, pathToFrequencies, [
		'exact_times',
	])

	await db[RUN](`\
INSERT INTO frequencies
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT
	${has_exact_times ? `` : `NULL AS exact_times,`}
	*
	REPLACE (
		-- dummy entry in case no optional column is present
		trip_id AS trip_id,
		${has_exact_times ? `\
		-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
		-- DuckDB array/list indixes are 1-based.
		-- Also, we explicitly cast until https://github.com/duckdb/duckdb/issues/17431 is resolved.
		enum_range(NULL::exact_times_v)[exact_times::integer + 1] AS exact_times
		` : ``}
	),
	row_number() OVER (PARTITION BY trip_id, exact_times) AS frequencies_row
FROM read_csv(
	'${pathToFrequencies}',
	header = true,
	sample_size = ${duckdbReadCsvAutodetectionSampleSize},
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
	types = {
		start_time: 'INTERVAL',
		end_time: 'INTERVAL',
		${has_exact_times ? `exact_times: 'INTEGER',` : ``}
	}
);
`)

	await db[RUN](`\
-- We create UNIQUE index *afterwards* to make the data import faster.
-- frequencies' primary is just (trip_id, start_time)
-- however, the definition for the headway_secs field says:
-- > Multiple headways may be defined for the same trip, but must not overlap. New headways may start at the exact time the previous headway ends.
-- https://gtfs.org/documentation/schedule/reference/#frequenciestxt
-- todo: add more columns once there is consensus in https://github.com/google/transit/issues/514
CREATE UNIQUE INDEX frequencies_unique ON frequencies (
	trip_id,
	-- As of v1.0.0, DuckDB does not support UNIQUE indexes on INTERVAL columns yet, so we cast to INTEGER.
	(start_time::string)
);

CREATE INDEX frequencies_trip_id ON frequencies (trip_id);
CREATE INDEX frequencies_exact_times ON frequencies (exact_times);
`)

	workingState.nrOfRowsByName.set('frequencies', await queryNumberOfRows(db, 'frequencies', opt))
}

importData.runDespiteMissingSrcFile = true

module.exports = importData
