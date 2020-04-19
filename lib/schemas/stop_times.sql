# https://developers.google.com/transit/gtfs/reference#stop_timestxt

CREATE TYPE pickup_drop_off_type AS ENUM (
	0, # 0 or empty - Regularly scheduled pickup/dropoff.
	1, # No pickup/dropoff available.
	2, # Must phone agency to arrange pickup/dropoff.
	3, # Must coordinate with driver to arrange pickup/dropoff.
);

CREATE TYPE timepoint_val AS ENUM (
	0, # Times are considered approximate.
	1, # 1 or empty - Times are considered exact.
);

CREATE TABLE stop_times (
	trip_id TEXT NOT NULL,
	FOREIGN KEY trip_id REFERENCES trips,
	# todo: For times occurring after midnight on the service day, enter the time as a value greater than 24:00:00 in HH:MM:SS local time for the day on which the trip schedule begins.
	arrival_time TIME,
	departure_time TIME,
	stop_id TEXT NOT NULL,
	FOREIGN KEY stop_id REFERENCES stops,
	stop_sequence INT NOT NULL,
	stop_headsign TEXT,
	pickup_type pickup_drop_off_type,
	drop_off_type pickup_drop_off_type,
	shape_dist_traveled REAL,
	timepoint timepoint_val,
)
