'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#calendartxt
const importData = async (db, pathToCalendar, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE "${opt.schema}.availability" AS ENUM (
	'not_available' -- 0 – Service is not available for Mondays in the date range.
	, 'available' -- 1 – Service is available for all Mondays in the date range.
);
-- CREATE CAST ("${opt.schema}.availability" AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}.calendar" (
	service_id TEXT PRIMARY KEY,
	monday "${opt.schema}.availability" NOT NULL,
	tuesday "${opt.schema}.availability" NOT NULL,
	wednesday "${opt.schema}.availability" NOT NULL,
	thursday "${opt.schema}.availability" NOT NULL,
	friday "${opt.schema}.availability" NOT NULL,
	saturday "${opt.schema}.availability" NOT NULL,
	sunday "${opt.schema}.availability" NOT NULL,
	start_date DATE NOT NULL,
	end_date DATE NOT NULL
);
`)

	if (pathToCalendar !== null) {
		await db[RUN](`\
INSERT INTO "${opt.schema}.calendar"
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::"${opt.schema}.availability")[monday + 1] AS monday,
	enum_range(NULL::"${opt.schema}.availability")[tuesday + 1] AS tuesday,
	enum_range(NULL::"${opt.schema}.availability")[wednesday + 1] AS wednesday,
	enum_range(NULL::"${opt.schema}.availability")[thursday + 1] AS thursday,
	enum_range(NULL::"${opt.schema}.availability")[friday + 1] AS friday,
	enum_range(NULL::"${opt.schema}.availability")[saturday + 1] AS saturday,
	enum_range(NULL::"${opt.schema}.availability")[sunday + 1] AS sunday,
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
	-- todo: all_varchar = true, types
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

module.exports = importData
