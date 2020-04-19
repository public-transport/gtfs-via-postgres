-- https://developers.google.com/transit/gtfs/reference#frequenciestxt

CREATE TYPE exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);

CREATE TABLE frequencies (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	start_time DATE NOT NULL,
	end_time DATE NOT NULL,
	headway_secs INT NOT NULL,
	exact_times exact_times_v
);
