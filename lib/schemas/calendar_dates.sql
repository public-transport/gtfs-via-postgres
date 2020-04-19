-- https://developers.google.com/transit/gtfs/reference#calendar_datestxt

CREATE TYPE exception_type_v AS ENUM (
	'added' -- 1 – Service has been added for the specified date.
	, 'removed' -- 2 – Service has been removed for the specified date.
);

CREATE TABLE calendar_dates (
	service_id TEXT NOT NULL,
	FOREIGN KEY (service_id) REFERENCES calendar,
	"date" DATE NOT NULL,
	exception_type exception_type_v NOT NULL
);
