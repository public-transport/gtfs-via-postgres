'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#calendartxt
const importData = async (db, pathToCalendar, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE availability AS ENUM (
	'not_available' -- 0 – Service is not available for Mondays in the date range.
	, 'available' -- 1 – Service is available for all Mondays in the date range.
);
-- CREATE CAST (availability AS text) WITH INOUT AS IMPLICIT;

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
`)

	if (pathToCalendar !== null) {
		await db[RUN](`\
INSERT INTO calendar
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::availability)[monday + 1] AS monday,
	enum_range(NULL::availability)[tuesday + 1] AS tuesday,
	enum_range(NULL::availability)[wednesday + 1] AS wednesday,
	enum_range(NULL::availability)[thursday + 1] AS thursday,
	enum_range(NULL::availability)[friday + 1] AS friday,
	enum_range(NULL::availability)[saturday + 1] AS saturday,
	enum_range(NULL::availability)[sunday + 1] AS sunday,
	array_slice(start_date, 0, 4) || '-' || array_slice(start_date, 5, 6) || '-' || array_slice(start_date, 7, 8) AS start_date,
	array_slice(end_date, 0, 4) || '-' || array_slice(end_date, 5, 6) || '-' || array_slice(end_date, 7, 8) AS end_date
)
FROM read_csv(
	'${pathToCalendar}',
	header = true,
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
	types = {
		service_id: 'TEXT',
		monday: 'UINTEGER',
		tuesday: 'UINTEGER',
		wednesday: 'UINTEGER',
		thursday: 'UINTEGER',
		friday: 'UINTEGER',
		saturday: 'UINTEGER',
		sunday: 'UINTEGER',
		start_date: 'TEXT',
		end_date: 'TEXT'
	}
);
`)
	}

	workingState.nrOfRowsByName.set('calendar', await queryNumberOfRows(db, 'calendar', opt))
}

importData.runDespiteMissingSrcFile = true

module.exports = importData
