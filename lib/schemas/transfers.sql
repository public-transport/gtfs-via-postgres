# https://developers.google.com/transit/gtfs/reference#transferstxt

CREATE TYPE transfer_type_v AS ENUM (
	0, # 0 or empty - Recommended transfer point between routes.
	1, # 1 - Timed transfer point between two routes. The departing vehicle is expected to wait for the arriving one and leave sufficient time for a rider to transfer between routes.
	2, # 3 - Transfers are not possible between routes at the location.
);

CREATE TABLE transfers (
	from_stop_id TEXT,
	FOREIGN KEY from_stop_id REFERENCES stops,
	to_stop_id TEXT,
	FOREIGN KEY to_stop_id REFERENCES stops,
	PRIMARY KEY (from_stop_id, to_stop_id),
	transfer_type transfer_type_v,
	min_transfer_time INT,
)
