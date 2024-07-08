'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#levelstxt
const importData = async (db, pathToLevels, opt, workingState) => {
	await db[RUN](`\
CREATE TABLE "${opt.schema}".levels (
	level_id TEXT PRIMARY KEY,
	level_index REAL NOT NULL,
	level_name TEXT
);

INSERT INTO "${opt.schema}".levels
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT *
FROM read_csv(
	'${pathToLevels}',
	header = true,
	-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
	-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
	-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
	-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
	auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR'],
	-- todo: all_varchar = true, types
	types = {
		level_index: 'REAL',
	}
);

`)

	workingState.nrOfRowsByName.set('levels', await queryNumberOfRows(db, 'levels', opt))
}

module.exports = importData
