'use strict'

// https://gtfs.org/schedule/reference/#feed_infotxt
const beforeAll = (opt) => `\
-- The MobilityData GTFS Validator just uses Java's Locale#toLanguageTag() to validate *_lang.
-- https://github.com/MobilityData/gtfs-validator/blob/31ff374800f7d7883fd9de91b71049c2a4de4e45/main/src/main/java/org/mobilitydata/gtfsvalidator/validator/MatchingFeedAndAgencyLangValidator.java#L82
-- https://docs.oracle.com/javase/7/docs/api/java/util/Locale.html
-- related: https://github.com/google/transit/pull/98
CREATE TABLE "${opt.schema}".feed_info (
	feed_publisher_name TEXT PRIMARY KEY,
	feed_publisher_url TEXT NOT NULL,
	feed_lang TEXT NOT NULL
		CONSTRAINT valid_feed_lang CHECK (
			"${opt.schema}".is_valid_lang_code(feed_lang)
		),
	default_lang TEXT
		CONSTRAINT valid_default_lang CHECK (
			default_lang IS NULL OR "${opt.schema}".is_valid_lang_code(default_lang)
		),
	feed_start_date DATE,
	feed_end_date DATE,
	feed_version TEXT,
	feed_contact_email TEXT,
	feed_contact_url TEXT
);

COPY "${opt.schema}".feed_info (
	feed_publisher_name,
	feed_publisher_url,
	feed_lang,
	default_lang,
	feed_start_date,
	feed_end_date,
	feed_version,
	feed_contact_email,
	feed_contact_url
) FROM STDIN csv;
`

const formatFeedInfoRow = (i) => {
	return [
		i.feed_publisher_name || null,
		i.feed_publisher_url || null,
		i.feed_lang || null,
		i.default_lang || null,
		i.feed_start_date || null,
		i.feed_end_date || null,
		i.feed_version || null,
		i.feed_contact_email || null,
		i.feed_contact_url || null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatFeedInfoRow,
	afterAll,
}
