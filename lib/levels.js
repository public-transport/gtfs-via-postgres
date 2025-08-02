'use strict'

const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#levelstxt
const importData = async (db, pathToLevels, opt, workingState) => {
	await db[RUN](`\
CREATE TABLE levels (
	level_id TEXT PRIMARY KEY,
	level_index REAL NOT NULL,
	level_name TEXT
);

INSERT INTO levels
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
	types = {
		level_index: 'REAL',
	}
);

-- For a primary key, DuckDB doesn't create an index automatically.
CREATE UNIQUE INDEX levels_level_id ON levels(level_id);
`)

	workingState.nrOfRowsByName.set('levels', await queryNumberOfRows(db, 'levels', opt))
}

module.exports = importData
