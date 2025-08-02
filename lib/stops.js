'use strict'

const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#stopstxt
const importData = async (db, pathToStops, opt, workingState) => {
	// Several columns are optional, so they may be missing in a `read_csv()` result.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// todo: github ticket?
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		stop_code: has_stop_code,
		stop_desc: has_stop_desc,
		zone_id: has_zone_id,
		stop_url: has_stop_url,
		location_type: has_location_type,
		parent_station: has_parent_station,
		stop_timezone: has_stop_timezone,
		wheelchair_boarding: has_wheelchair_boarding,
		level_id: has_level_id,
		platform_code: has_platform_code,
	} = await queryIfColumnsExist(db, pathToStops, [
		'stop_code',
		'stop_desc',
		'zone_id',
		'stop_url',
		'location_type',
		'parent_station',
		'stop_timezone',
		'wheelchair_boarding',
		'level_id',
		'platform_code',
	])

	await db[RUN](`\
CREATE TYPE location_type_val AS ENUM (
	'stop' -- 0 (or blank): Stop (or Platform). A location where passengers board or disembark from a transit vehicle. Is called a platform when defined within a parent_station.
	, 'station' -- 1 – Station. A physical structure or area that contains one or more platform.
	, 'entrance_exit' -- 2 – Entrance/Exit. A location where passengers can enter or exit a station from the street. If an entrance/exit belongs to multiple stations, it can be linked by pathways to both, but the data provider must pick one of them as parent.
	, 'node' -- 3 – Generic Node. A location within a station, not matching any other location_type, which can be used to link together pathways define in pathways.txt.
	, 'boarding_area' -- 4 – Boarding Area. A specific location on a platform, where passengers can board and/or alight vehicles.
);
-- CREATE CAST (location_type_val AS text) WITH INOUT AS IMPLICIT;

-- For parentless stops:
-- 0 or empty - No accessibility information for the stop.
-- 1 - Some vehicles at this stop can be boarded by a rider in a wheelchair.
-- 2 - Wheelchair boarding is not possible at this stop.

-- For child stops:
-- 0 or empty - Stop will inherit its wheelchair_boarding behavior from the parent station, if specified in the parent.
-- 1 - There exists some accessible path from outside the station to the specific stop/platform.
-- 2 - There exists no accessible path from outside the station to the specific stop/platform.

-- For station entrances/exits:
-- 0 or empty - Station entrance will inherit its wheelchair_boarding behavior from the parent station, if specified for the parent.
-- 1 - Station entrance is wheelchair accessible.
-- 2 - No accessible path from station entrance to stops/platforms.
CREATE TYPE wheelchair_boarding_val AS ENUM (
	'no_info_or_inherit'
	, 'accessible'
	, 'not_accessible'
);
-- CREATE CAST (wheelchair_boarding_val AS text) WITH INOUT AS IMPLICIT;

INSTALL spatial; -- todo: make install optional?
LOAD spatial;

CREATE TABLE stops (
	stop_id TEXT PRIMARY KEY,
	stop_code TEXT,
	-- todo: Required for locations which are stops (location_type=0), stations (location_type=1) or entrances/exits (location_type=2). Optional for locations which are generic nodes (location_type=3) or boarding areas (location_type=4).
	stop_name TEXT,
	stop_desc TEXT,
	stop_loc GEOMETRY, -- stop_lat/stop_lon
	zone_id TEXT,
	stop_url TEXT,
	location_type location_type_val,
	parent_station TEXT,
	-- In stops.txt, *any* row's parent_station might reference *any* other row. Essentially, stops.txt describes a tree.
	-- As of DuckDB v1.0.0, it *seems* like adding a foreign key constraint here doesn't work, even if we order the stops to put parents before their children (see below).
	-- todo: Report this with DuckDB? Alternatively, add the constraint after the import (see below).
	-- maybe related? https://github.com/duckdb/duckdb/issues/10574
	-- FOREIGN KEY (parent_station) REFERENCES stops(stop_id),
	stop_timezone TEXT,
	FOREIGN KEY (stop_timezone) REFERENCES valid_timezones,
	wheelchair_boarding wheelchair_boarding_val,
	level_id TEXT,
	${opt.stopsWithoutLevelId ? '' : `FOREIGN KEY (level_id) REFERENCES levels,`}
	platform_code TEXT
);

INSERT INTO stops
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
WITH RECURSIVE
	stops AS (
		SELECT
			${has_stop_code ? `` : `NULL AS stop_code,`}
			${has_stop_desc ? `` : `NULL AS stop_desc,`}
			${has_zone_id ? `` : `NULL AS zone_id,`}
			${has_stop_url ? `` : `NULL AS stop_url,`}
			${has_location_type ? `` : `NULL AS location_type,`}
			${has_parent_station ? `` : `NULL AS parent_station,`}
			${has_stop_timezone ? `` : `NULL AS stop_timezone,`}
			${has_wheelchair_boarding ? `` : `NULL AS wheelchair_boarding,`}
			${has_level_id ? `` : `NULL AS level_id,`}
			${has_platform_code ? `` : `NULL AS platform_code,`}
			ST_Point(stop_lon, stop_lat) AS stop_loc,
			*
			EXCLUDE (
				stop_lat, stop_lon
			)
			REPLACE (
				-- dummy entry in case no optional column is present
				stop_id AS stop_id,
				${has_location_type ? `
				-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
				-- DuckDB array/list indixes are 1-based.
				enum_range(NULL::location_type_val)[location_type + 1] AS location_type,
				` : ``}
				${has_wheelchair_boarding ? `
				-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
				-- DuckDB array/list indixes are 1-based.
				enum_range(NULL::wheelchair_boarding_val)[ifnull(wheelchair_boarding, 0) + 1] AS wheelchair_boarding
				` : ``}
			)
		FROM read_csv(
			'${pathToStops}',
			header = true,
			-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
			-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
			-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
			-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
			auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
			types = {
				-- dummy entry in case no optional column is present
				stop_id: 'TEXT',
				${has_stop_code ? `stop_code: 'TEXT',` : ``}
				${has_location_type ? `location_type: 'INTEGER',` : ``}
				${has_wheelchair_boarding ? `wheelchair_boarding: 'INTEGER',` : ``}
				${has_platform_code ? `platform_code: 'TEXT',` : ``}
			}
		)
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

-- todo: DuckDB v1.0.0 doesn't support them yet:
-- > The ADD CONSTRAINT and DROP CONSTRAINT clauses are not yet supported in DuckDB.
-- ALTER TABLE stops
-- ADD CONSTRAINT stops_parent_station_fkey
-- FOREIGN KEY (parent_station) REFERENCES stops(stop_id);

-- For a primary key, DuckDB doesn't create an index automatically.
CREATE UNIQUE INDEX stops_stop_id ON stops(stop_id);

CREATE INDEX stops_parent_station ON stops (parent_station);
${opt.stopsLocationIndex ? `CREATE INDEX stops_stop_loc ON stops (stop_loc);` : ''}
`)

	workingState.nrOfRowsByName.set('stops', await queryNumberOfRows(db, 'stops', opt))
}

module.exports = importData
