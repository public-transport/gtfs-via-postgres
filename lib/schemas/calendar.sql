-- https://developers.google.com/transit/gtfs/reference#calendartxt

CREATE TYPE availability AS ENUM (
	'not_available' -- 0 – Service is not available for Mondays in the date range.
	, 'available' -- 1 – Service is available for all Mondays in the date range.
);

CREATE TABLE calendar (
	service_id TEXT PRIMARY KEY,
	monday availability NOT NULL,
	tuesday availability NOT NULL,
	wednesday availability NOT NULL,
	thursday availability NOT NULL,
	friday availability NOT NULL,
	saturday availability NOT NULL,
	sunday availability NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL
);
