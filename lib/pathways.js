'use strict'

const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#pathwaystxt
const importData = async (db, pathToPathways, opt, workingState) => {
	// Several columns are optional, so their columns may be missing in a `read_csv()` result.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		length: has_length,
		traversal_time: has_traversal_time,
		stair_count: has_stair_count,
		max_slope: has_max_slope,
		min_width: has_min_width,
		signposted_as: has_signposted_as,
		reversed_signposted_as: has_reversed_signposted_as,
	} = await queryIfColumnsExist(db, pathToPathways, [
		'length',
		'traversal_time',
		'stair_count',
		'max_slope',
		'min_width',
		'signposted_as',
		'reversed_signposted_as',
	])

	await db[RUN](`\
CREATE TYPE pathway_mode_v AS ENUM (
	'walkway' -- 1
	, 'stairs' -- 2
	, 'moving_sidewalk_travelator' -- 3 – moving sidewalk/travelator
	, 'escalator' -- 4
	, 'elevator' -- 5
	, 'fare_gate' -- 6 – (or payment gate): A pathway that crosses into an area of the station where a proof of payment is required (usually via a physical payment gate).
	-- Fare gates may either separate paid areas of the station from unpaid ones, or separate different payment areas within the same station from each other. This information can be used to avoid routing passengers through stations using shortcuts that would require passengers to make unnecessary payments, like directing a passenger to walk through a subway platform to reach a busway.
	, 'exit_gate' -- 7 – Indicates a pathway exiting an area where proof-of-payment is required into an area where proof-of-payment is no longer required.
);
-- CREATE CAST (pathway_mode_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE pathways (
	pathway_id TEXT PRIMARY KEY,
	from_stop_id TEXT NOT NULL,
	FOREIGN KEY (from_stop_id) REFERENCES stops (stop_id),
	to_stop_id TEXT NOT NULL,
	FOREIGN KEY (to_stop_id) REFERENCES stops (stop_id),
	pathway_mode pathway_mode_v NOT NULL,
	is_bidirectional BOOLEAN NOT NULL,
	length REAL, -- todo: add non-negative constraint
	traversal_time INTEGER, -- todo: add positive constraint
	stair_count INTEGER, -- todo: add non-0 constraint
	max_slope REAL,
	min_width REAL, -- todo: add positive constraint
	signposted_as TEXT,
	reversed_signposted_as TEXT
);

INSERT INTO pathways
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT * REPLACE (
	-- todo: check that is_bidirectional is actually 0 or 1
	-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
	-- DuckDB array/list indixes are 1-based.
	enum_range(NULL::pathway_mode_v)[pathway_mode] AS pathway_mode
)
FROM read_csv(
	'${pathToPathways}',
	header = true,
	all_varchar = true,
	types = {
		pathway_mode: 'INTEGER',
		is_bidirectional: 'INTEGER'
		${has_length ? `, length: 'REAL'` : ``}
		${has_traversal_time ? `, traversal_time: 'INTEGER'` : ``}
		${has_stair_count ? `, stair_count: 'INTEGER'` : ``}
		${has_max_slope ? `, max_slope: 'REAL'` : ``}
		${has_min_width ? `, min_width: 'REAL'` : ``}
		${has_signposted_as ? `, signposted_as: 'TEXT'` : ``}
		${has_reversed_signposted_as ? `, reversed_signposted_as: 'TEXT'` : ``}
	}
);
`)

	workingState.nrOfRowsByName.set('pathways', await queryNumberOfRows(db, 'pathways', opt))
}

module.exports = importData
