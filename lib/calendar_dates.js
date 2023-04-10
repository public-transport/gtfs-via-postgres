'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#calendar_datestxt
const importData = async (db, pathToCalendarDates, opt, workingState) => {
	await db[RUN](`\
CREATE TYPE "${opt.schema}".exception_type_v AS ENUM (
	'added' -- 1 – Service has been added for the specified date.
	, 'removed' -- 2 – Service has been removed for the specified date.
);

CREATE TABLE "${opt.schema}".calendar_dates (
	service_id TEXT NOT NULL,
	"date" DATE NOT NULL,
	PRIMARY KEY (service_id, "date"),
	--CONSTRAINT primary_key PRIMARY KEY (service_id, "date"),
	exception_type "${opt.schema}".exception_type_v NOT NULL
);

INSERT INTO "${opt.schema}".calendar_dates
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	array_slice(date, 0, 4) || '-' || array_slice(date, 5, 6) || '-' || array_slice(date, 7, 8) AS date,
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::"${opt.schema}".exception_type_v)[exception_type] AS exception_type,
)
FROM read_csv(
	'${pathToCalendarDates}',
	header = true,
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
	-- todo: all_varchar = true, types
	types = {
		service_id: 'TEXT',
		date: 'TEXT',
		exception_type: 'UINTEGER'
	}
);

CREATE INDEX calendar_dates_service_id ON "${opt.schema}".calendar_dates (service_id);
CREATE INDEX calendar_dates_exception_type ON "${opt.schema}".calendar_dates (exception_type);
`)

	workingState.nrOfRowsByName.set('calendar_dates', await queryNumberOfRows(db, 'calendar_dates', opt))
}

module.exports = importData
