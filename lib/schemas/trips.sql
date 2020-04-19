# https://developers.google.com/transit/gtfs/reference#tripstxt

CREATE TYPE wheelchair_accessibility AS ENUM (
	0, # 0 or empty - No accessibility information for the trip.
	1, # Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.
	2, # No riders in wheelchairs can be accommodated on this trip.
);

CREATE TYPE bikes_allowance AS ENUM (
	0, # 0 or empty - No bike information for the trip.
	1, # Vehicle being used on this particular trip can accommodate at least one bicycle.
	2, # No bicycles are allowed on this trip.
);

CREATE TABLE trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	FOREIGN KEY route_id REFERENCES routes,
	service_id TEXT NOT NULL,
	FOREIGN KEY service_id REFERENCES calendar service_id,
	trip_headsign TEXT,
	trip_short_name TEXT,
	direction_id INT,
	block_id TEXT,
	shape_id TEXT,
	FOREIGN KEY shape_id REFERENCES shapes,
	wheelchair_accessible wheelchair_accessibility,
	bikes_allowed bikes_allowance,
)
