'use strict'

// https://gtfs.org/documentation/schedule/reference/#stopstxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".location_type_val AS ENUM (
	'stop' -- 0 (or blank): Stop (or Platform). A location where passengers board or disembark from a transit vehicle. Is called a platform when defined within a parent_station.
	, 'station' -- 1 – Station. A physical structure or area that contains one or more platform.
	, 'entrance_exit' -- 2 – Entrance/Exit. A location where passengers can enter or exit a station from the street. If an entrance/exit belongs to multiple stations, it can be linked by pathways to both, but the data provider must pick one of them as parent.
	, 'node' -- 3 – Generic Node. A location within a station, not matching any other location_type, which can be used to link together pathways define in pathways.txt.
	, 'boarding_area' -- 4 – Boarding Area. A specific location on a platform, where passengers can board and/or alight vehicles.
);
CREATE CAST ("${opt.schema}".location_type_val AS text) WITH INOUT AS IMPLICIT;

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
CREATE TYPE "${opt.schema}".wheelchair_boarding_val AS ENUM (
	'no_info_or_inherit'
	, 'accessible'
	, 'not_accessible'
);
CREATE CAST ("${opt.schema}".wheelchair_boarding_val AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".stops (
	stop_id TEXT PRIMARY KEY,
	stop_code TEXT,
	-- todo: Required for locations which are stops (location_type=0), stations (location_type=1) or entrances/exits (location_type=2). Optional for locations which are generic nodes (location_type=3) or boarding areas (location_type=4).
	stop_name TEXT,
	stop_desc TEXT,
	stop_loc geography(POINT), -- stop_lat/stop_lon
	zone_id TEXT,
	stop_url TEXT,
	location_type "${opt.schema}".location_type_val,
	parent_station TEXT,
	stop_timezone TEXT CHECK ("${opt.schema}".is_timezone(stop_timezone)),
	wheelchair_boarding "${opt.schema}".wheelchair_boarding_val,
	level_id TEXT,
	${opt.stopsWithoutLevelId ? '' : `FOREIGN KEY (level_id) REFERENCES "${opt.schema}".levels,`}
	platform_code TEXT
);

COPY "${opt.schema}".stops (
	stop_id,
	stop_code,
	stop_name,
	stop_desc,
	stop_loc,
	zone_id,
	stop_url,
	location_type,
	parent_station,
	stop_timezone,
	wheelchair_boarding,
	level_id,
	platform_code
) FROM STDIN csv;
`

const locationType = (val) => {
	if (val === '0') return 'stop'
	if (val === '1') return 'station'
	if (val === '2') return 'entrance_exit'
	if (val === '3') return 'node'
	if (val === '4') return 'boarding_area'
	throw new Error('invalid/unsupported location_type: ' + val)
}

const wheelchairBoarding = (val) => {
	if (val === '0') return 'no_info_or_inherit'
	if (val === '1') return 'accessible'
	if (val === '2') return 'not_accessible'
	throw new Error('invalid/unsupported wheelchair_boarding: ' + val)
}

const formatStopsRow = (s) => {
	return [
		s.stop_id || null,
		s.stop_code || null,
		s.stop_name || null,
		s.stop_desc || null,
		`POINT(${parseFloat(s.stop_lon)} ${parseFloat(s.stop_lat)})`,
		s.zone_id || null,
		s.stop_url || null,
		s.location_type
			? locationType(s.location_type)
			: null,
		s.parent_station || null,
		s.stop_timezone || null,
		s.wheelchair_boarding
			? wheelchairBoarding(s.wheelchair_boarding)
			: null,
		s.level_id || null,
		s.platform_code || null,
	]
}

const afterAll = (opt) => `\
\\.

ALTER TABLE "${opt.schema}".stops
ADD CONSTRAINT stops_parent_station_fkey
FOREIGN KEY (parent_station) REFERENCES "${opt.schema}".stops;

CREATE INDEX ON "${opt.schema}".stops (parent_station);
${opt.stopsLocationIndex ? `CREATE INDEX ON "${opt.schema}".stops (stop_loc);` : ''}
`

module.exports = {
	beforeAll,
	formatRow: formatStopsRow,
	afterAll,
}
