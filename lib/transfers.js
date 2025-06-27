'use strict'

const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#transferstxt
const importData = async (db, pathToTransfers, opt, workingState) => {
	// min_transfer_time is optional, so the entire column can be missing.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		min_transfer_time: has_min_transfer_time,
	} = await queryIfColumnsExist(db, pathToTransfers, [
		'min_transfer_time',
	])

	await db[RUN](`\
CREATE TYPE transfer_type_v AS ENUM (
	'recommended' -- 0 or empty - Recommended transfer point between routes.
	, 'timed' -- 1 - Timed transfer point between two routes. The departing vehicle is expected to wait for the arriving one and leave sufficient time for a rider to transfer between routes.
	, 'minimum_time' -- 2 – Transfer requires a minimum amount of time between arrival and departure to ensure a connection. The time required to transfer is specified by min_transfer_time.
	, 'impossible' -- 3 - Transfers are not possible between routes at the location.
	, 'in_seat' -- 4 - Passengers can transfer from one trip to another by staying onboard the same vehicle (an "in-seat transfer").
	, 're_board' -- 5 - In-seat transfers are not allowed between sequential trips. The passenger must alight from the vehicle and re-board.
);
-- CREATE CAST (transfer_type_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE transfers (
	from_stop_id TEXT,
	FOREIGN KEY (from_stop_id) REFERENCES stops,
	to_stop_id TEXT,
	FOREIGN KEY (to_stop_id) REFERENCES stops,
	transfer_type transfer_type_v,
	min_transfer_time INT,
	from_route_id TEXT,
	FOREIGN KEY (from_route_id) REFERENCES routes,
	to_route_id TEXT,
	FOREIGN KEY (from_route_id) REFERENCES routes,
	from_trip_id TEXT,
	FOREIGN KEY (from_trip_id) REFERENCES trips,
	to_trip_id TEXT,
	FOREIGN KEY (from_trip_id) REFERENCES trips,
	-- We're not using a primary key index here because several columns can be NULL.
	UNIQUE (
		from_stop_id,
		from_trip_id,
		from_route_id,
		to_stop_id,
		to_trip_id,
		to_route_id
	)
);

INSERT INTO transfers
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::transfer_type_v)[transfer_type + 1] AS transfer_type
)
FROM read_csv(
	'${pathToTransfers}',
	header = true,
	all_varchar = true,
	types = {
		transfer_type: 'INTEGER'
		${has_min_transfer_time ? `, min_transfer_time: 'INTEGER'` : ``}
	}
);
`)

	workingState.nrOfRowsByName.set('frequencies', await queryNumberOfRows(db, 'frequencies', opt))
}

module.exports = importData
