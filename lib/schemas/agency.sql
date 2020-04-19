# https://developers.google.com/transit/gtfs/reference#agencytxt
CREATE TABLE agency (
	agency_id TEXT PRIMARY KEY,
	agency_name TEXT NOT NULL,
	agency_url TEXT NOT NULL,
	agency_timezone TEXT NOT NULL, # todo: validate?
	agency_lang TEXT, # todo: validate?
	agency_phone TEXT,
	agency_fare_url TEXT,
	agency_email TEXT,
)
