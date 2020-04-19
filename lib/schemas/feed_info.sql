# https://developers.google.com/transit/gtfs/reference#feed_infotxt
CREATE TABLE feed_info (
	feed_publisher_name TEXT NOT NULL,
	feed_publisher_url TEXT NOT NULL,
	feed_lang TEXT NOT NULL,
	default_lang TEXT,
	feed_start_date DATE,
	feed_end_date DATE,
	feed_version TEXT,
	feed_contact_email TEXT,
	feed_contact_url TEXT,
)
