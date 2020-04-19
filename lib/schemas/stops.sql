-- https://developers.google.com/transit/gtfs/reference#stopstxt

CREATE TYPE location_type_val AS ENUM (
	'stop' -- 0 (or blank): Stop (or Platform). A location where passengers board or disembark from a transit vehicle. Is called a platform when defined within a parent_station.
	, 'station' -- 1 – Station. A physical structure or area that contains one or more platform.
	, 'entrance_exit' -- 2 – Entrance/Exit. A location where passengers can enter or exit a station from the street. If an entrance/exit belongs to multiple stations, it can be linked by pathways to both, but the data provider must pick one of them as parent.
	, 'node' -- 3 – Generic Node. A location within a station, not matching any other location_type, which can be used to link together pathways define in pathways.txt.
	, 'boarding_area' -- 4 – Boarding Area. A specific location on a platform, where passengers can board and/or alight vehicles.
);

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

CREATE TABLE stops (
	stop_id TEXT PRIMARY KEY,
	stop_code TEXT,
	-- todo: Required for locations which are stops (location_type=0), stations (location_type=1) or entrances/exits (location_type=2). Optional for locations which are generic nodes (location_type=3) or boarding areas (location_type=4).
	stop_name TEXT,
	stop_desc TEXT,
	stop_loc geography(POINT), -- stop_lat/stop_lon
	zone_id TEXT,
	stop_url TEXT,
	location_type location_type_val,
	parent_station TEXT,
	stop_timezone TEXT, -- todo: validate
	wheelchair_boarding wheelchair_boarding_val,
	level_id TEXT,
	-- todo: FOREIGN KEY (level_id) REFERENCES levels,
	platform_code TEXT
);
