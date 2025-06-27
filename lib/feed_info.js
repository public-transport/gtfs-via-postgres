'use strict'

const RUN = require('./run.js')

// https://gtfs.org/documentation/schedule/reference/#feed_infotxt
const importData = async (db, pathToFeedInfo, opt, workingState) => {
	await db[RUN](`\
-- The MobilityData GTFS Validator just uses Java's Locale#toLanguageTag() to validate *_lang.
-- https://github.com/MobilityData/gtfs-validator/blob/31ff374800f7d7883fd9de91b71049c2a4de4e45/main/src/main/java/org/mobilitydata/gtfsvalidator/validator/MatchingFeedAndAgencyLangValidator.java#L82
-- https://docs.oracle.com/javase/7/docs/api/java/util/Locale.html
-- related: https://github.com/google/transit/pull/98
CREATE TABLE feed_info (
	feed_publisher_name TEXT PRIMARY KEY,
	feed_publisher_url TEXT NOT NULL,
	feed_lang TEXT NOT NULL,
	FOREIGN KEY (feed_lang) REFERENCES valid_lang_codes,
	default_lang TEXT,
	FOREIGN KEY (default_lang) REFERENCES valid_lang_codes,
	feed_start_date DATE,
	feed_end_date DATE,
	feed_version TEXT,
	-- todo: optional, how to handle this?
	feed_contact_email TEXT,
	feed_contact_url TEXT
);

INSERT INTO feed_info
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	(
		array_slice(feed_start_date, 0, 4)
		|| '-' || array_slice(feed_start_date, 5, 6)
		|| '-' || array_slice(feed_start_date, 7, 8)
	) AS feed_start_date,
	(
		array_slice(feed_end_date, 0, 4)
		|| '-' || array_slice(feed_end_date, 5, 6)
		|| '-' || array_slice(feed_end_date, 7, 8)
	) AS feed_end_date
)
FROM read_csv(
	'${pathToFeedInfo}',
	header = true,
	-- > Option to skip type detection for CSV parsing and assume all columns to be of type VARCHAR [a.k.a. TEXT].
	all_varchar = true
);
`)
}

module.exports = importData
