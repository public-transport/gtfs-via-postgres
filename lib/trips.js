'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#tripstxt
const importData = async (db, pathToTrips, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE "${opt.schema}".wheelchair_accessibility AS ENUM (
	'unknown' -- 0 or empty - No accessibility information for the trip.
	, 'accessible' -- 1 – Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.
	, 'not_accessible' -- 2 – No riders in wheelchairs can be accommodated on this trip.
);

CREATE TYPE "${opt.schema}".bikes_allowance AS ENUM (
	'unknown' -- 0 or empty - No bike information for the trip.
	, 'allowed' -- 1 – Vehicle being used on this particular trip can accommodate at least one bicycle.
	, 'not_allowed' -- 2 – No bicycles are allowed on this trip.
);

CREATE TABLE "${opt.schema}".trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	FOREIGN KEY (route_id) REFERENCES "${opt.schema}".routes,
	-- todo: add foreign key constraint?
	service_id TEXT NOT NULL, -- references "${opt.schema}".service_days.service_id
	trip_headsign TEXT,
	trip_short_name TEXT,
	direction_id INT,
	block_id TEXT,
	shape_id TEXT, -- todo: add NOT NULL?
	-- ${opt.tripsWithoutShapeId ? '' : `FOREIGN KEY (shape_id) REFERENCES "${opt.schema}".shapes,`}
	wheelchair_accessible "${opt.schema}".wheelchair_accessibility,
	bikes_allowed "${opt.schema}".bikes_allowance
);

INSERT INTO "${opt.schema}".trips
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::wheelchair_accessibility)[wheelchair_accessible + 1] AS wheelchair_accessible,
	enum_range(NULL::bikes_allowance)[bikes_allowed + 1] AS bikes_allowed
)
FROM read_csv(
	'${pathToTrips}',
	header = true,
	all_varchar = true,
	types = {
		direction_id: 'INTEGER',
		wheelchair_accessible: 'INTEGER',
		bikes_allowed: 'INTEGER',
	}
);
`)

	workingState.nrOfRowsByName.set('trips', await queryNumberOfRows(db, 'trips', opt))
}

module.exports = importData
