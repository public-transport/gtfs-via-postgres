-- https://developers.google.com/transit/gtfs/reference#transferstxt

CREATE TYPE transfer_type_v AS ENUM (
	'recommended' -- 0 or empty - Recommended transfer point between routes.
	, 'timed' -- 1 - Timed transfer point between two routes. The departing vehicle is expected to wait for the arriving one and leave sufficient time for a rider to transfer between routes.
	, 'minimum_time' -- 2 – Transfer requires a minimum amount of time between arrival and departure to ensure a connection. The time required to transfer is specified by min_transfer_time.
	, 'impossible' -- 3 - Transfers are not possible between routes at the location.
);

CREATE TABLE transfers (
	id SERIAL PRIMARY KEY,
	from_stop_id TEXT,
	FOREIGN KEY (from_stop_id) REFERENCES stops,
	to_stop_id TEXT,
	FOREIGN KEY (to_stop_id) REFERENCES stops,
	transfer_type transfer_type_v,
	min_transfer_time INT,
	from_route_id TEXT,
	to_route_id TEXT,
	from_trip_id TEXT,
	to_trip_id TEXT,
	UNIQUE (
		from_stop_id,
		to_stop_id,
		from_route_id,
		to_route_id,
		from_trip_id,
		to_trip_id
	)
);
