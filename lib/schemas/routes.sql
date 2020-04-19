# https://developers.google.com/transit/gtfs/reference#routestxt

CREATE TYPE route_type_val AS ENUM (
	0, # Tram, Streetcar, Light rail. Any light rail or street level system within a metropolitan area.
	1, # Subway, Metro. Any underground rail system within a metropolitan area.
	2, # Rail. Used for intercity or long-distance travel.
	3, # Bus. Used for short- and long-distance bus routes.
	4, # Ferry. Used for short- and long-distance boat service.
	5, # Cable tram. Used for street-level rail cars where the cable runs beneath the vehicle, e.g., cable car in San Francisco.
	6, # Aerial lift, suspended cable car (e.g., gondola lift, aerial tramway). Cable transport where cabins, cars, gondolas or open chairs are suspended by means of one or more cables.
	7, # Funicular. Any rail system designed for steep inclines.
	11, # Trolleybus. Electric buses that draw power from overhead wires using poles.
	12, # Monorail. Railway in which the track consists of a single rail or a beam.
);

CREATE TABLE routes (
	route_id TEXT PRIMARY KEY,
	agency_id TEXT,
	FOREIGN KEY agency_id REFERENCES agency,
	# todo: Either route_short_name or route_long_name must be specified, or potentially both if appropriate.
	route_short_name TEXT,
	route_long_name TEXT,
	route_desc TEXT,
	route_type route_type_val NOT NULL,
	route_url TEXT,
	route_color TEXT,
	route_text_color TEXT,
	route_sort_order INT,
)
