'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#agencytxt
const importData = async (db, pathToAgency, opt, workingState) => {
	await db[RUN](`\
CREATE TABLE agency (
	agency_id TEXT PRIMARY KEY,
	agency_name TEXT NOT NULL,
	agency_url TEXT NOT NULL,
	agency_timezone TEXT NOT NULL REFERENCES valid_timezones (tz),
	agency_lang TEXT, -- todo: validate?
	agency_phone TEXT,
	agency_fare_url TEXT,
	agency_email TEXT
);

INSERT INTO agency
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT *
FROM read_csv(
	'${pathToAgency}',
	header = true,
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR']
);

-- For a primary key, DuckDB doesn't create an index automatically.
CREATE UNIQUE INDEX agency_agency_id ON agency(agency_id);
`)

	workingState.nrOfRowsByName.set('agency', await queryNumberOfRows(db, 'agency', opt))
}

module.exports = importData
