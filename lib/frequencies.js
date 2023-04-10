'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#frequenciestxt
const importData = async (db, pathToFrequencies, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE "${opt.schema}".exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);
CREATE CAST ("${opt.schema}".exact_times_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".frequencies (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES "${opt.schema}".trips,
	start_time INTERVAL NOT NULL,
	-- todo, once support by DuckDB: PRIMARY KEY (trip_id, start_time)
	end_time INTERVAL NOT NULL,
	headway_secs INT NOT NULL,
	exact_times "${opt.schema}".exact_times_v -- todo: NOT NULL & ifnull()
);

INSERT INTO "${opt.schema}".frequencies
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::exact_times_v)[exact_times + 1] AS exact_times
)
FROM read_csv(
	'${pathToFrequencies}',
	header = true,
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
	-- todo: all_varchar = true, types
	types = {
		start_time: 'INTERVAL',
		end_time: 'INTERVAL',
		exact_times: 'INTEGER',
	}
);

-- We create UNIQUE index *afterwards* to make the data import faster.
CREATE UNIQUE INDEX frequencies_unique ON "${opt.schema}".frequencies (
	trip_id,
	-- As of v1.0.0, DuckDB does not support UNIQUE indexes on INTERVAL columns yet, so we cast to INTEGER.
	(start_time::string),
	(end_time::string),
	headway_secs,
	exact_times
);

CREATE INDEX frequencies_trip_id ON "${opt.schema}".frequencies (trip_id);
CREATE INDEX frequencies_exact_times ON "${opt.schema}".frequencies (exact_times);
`)

	workingState.nrOfRowsByName.set('frequencies', await queryNumberOfRows(db, 'frequencies', opt))
}

module.exports = importData
