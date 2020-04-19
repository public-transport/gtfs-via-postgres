# https://developers.google.com/transit/gtfs/reference#calendartxt

CREATE TYPE weekday_service AS ENUM (
	0, # Service is not available for Mondays in the date range.
	1, # Service is available for all Mondays in the date range.
);

CREATE TABLE calendar (
	service_id TEXT PRIMARY KEY,
	monday weekday_service NOT NULL,
	tuesday weekday_service NOT NULL,
	wednesday weekday_service NOT NULL,
	thursday weekday_service NOT NULL,
	friday weekday_service NOT NULL,
	saturday weekday_service NOT NULL,
	sunday weekday_service NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL,
)
