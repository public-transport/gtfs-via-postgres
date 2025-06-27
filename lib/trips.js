'use strict'

const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#tripstxt
const importData = async (db, pathToTrips, opt, workingState) => {
	// Several columns are optional, so they may be missing in a `read_csv()` result.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// todo: github ticket?
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		wheelchair_accessible: has_wheelchair_accessible,
		bikes_allowed: has_bikes_allowed,
	} = await queryIfColumnsExist(db, pathToTrips, [
		'wheelchair_accessible',
		'bikes_allowed',
	])

	await db[RUN](`\
CREATE TYPE wheelchair_accessibility AS ENUM (
	'unknown' -- 0 or empty - No accessibility information for the trip.
	, 'accessible' -- 1 – Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.
	, 'not_accessible' -- 2 – No riders in wheelchairs can be accommodated on this trip.
);
-- CREATE CAST (wheelchair_accessibility AS text) WITH INOUT AS IMPLICIT;

CREATE TYPE bikes_allowance AS ENUM (
	'unknown' -- 0 or empty - No bike information for the trip.
	, 'allowed' -- 1 – Vehicle being used on this particular trip can accommodate at least one bicycle.
	, 'not_allowed' -- 2 – No bicycles are allowed on this trip.
);
-- CREATE CAST (bikes_allowance AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	FOREIGN KEY (route_id) REFERENCES routes,
	-- todo: add foreign key constraint?
	service_id TEXT NOT NULL, -- references service_days.service_id
	trip_headsign TEXT,
	trip_short_name TEXT,
	direction_id INT,
	block_id TEXT,
	shape_id TEXT,
	${opt.tripsWithoutShapeId ? '' : `FOREIGN KEY (shape_id) REFERENCES shapes,`}
	wheelchair_accessible wheelchair_accessibility,
	-- todo [breaking]: use 0/unknown for empty values
	bikes_allowed bikes_allowance
);

INSERT INTO trips
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT
	${has_wheelchair_accessible ? `` : `NULL AS wheelchair_accessible,`}
	${has_bikes_allowed ? `` : `NULL AS bikes_allowed,`}
	*
	REPLACE (
		-- dummy entry in case no optional column is present
		trip_id AS trip_id,
		${has_wheelchair_accessible ? `
		-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
		-- DuckDB array/list indixes are 1-based.
		enum_range(NULL::wheelchair_accessibility)[wheelchair_accessible + 1] AS wheelchair_accessible,
		` : ``}
		${has_bikes_allowed ? `
		-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
		-- DuckDB array/list indixes are 1-based.
		enum_range(NULL::bikes_allowance)[bikes_allowed + 1] AS bikes_allowed
		` : ``}
	)
FROM read_csv(
	'${pathToTrips}',
	header = true,
	all_varchar = true,
	types = {
		direction_id: 'INTEGER',
		${has_wheelchair_accessible ? `wheelchair_accessible: 'INTEGER',` : ``}
		${has_bikes_allowed ? `bikes_allowed: 'INTEGER',` : ``}
	}
);
`)

	workingState.nrOfRowsByName.set('trips', await queryNumberOfRows(db, 'trips', opt))
}

module.exports = importData
