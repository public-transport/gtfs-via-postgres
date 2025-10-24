'use strict'

const GET = require('./get.js')
const RUN = require('./run.js')
const {queryIfColumnsExist} = require('./columns.js')

// https://gtfs.org/documentation/schedule/reference/#shapestxt
const importData = async (db, pathToShapes, opt, workingState) => {
	// shape_dist_traveled is optional, so the entire column can be missing.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const {
		shape_dist_traveled: has_shape_dist_traveled,
	} = await queryIfColumnsExist(db, pathToShapes, [
		'shape_dist_traveled',
	])

	// todo: why does extracting `Count` directly work here and not with other files?
	const [
		{Count: nrOfShapes},
	] = await db[GET](`\
INSTALL spatial; -- todo: make install optional?
LOAD spatial;

CREATE TABLE shapes (
	shape_id TEXT PRIMARY KEY,
	shape GEOMETRY,
	distances_travelled REAL[]
);

INSERT INTO shapes
-- WITH
--	-- todo: explicitly specify if we want materialization!
--	-- see also https://github.com/duckdb/duckdb/pull/17459
-- 	csv_columns AS (
-- 		SELECT list(column_name) AS cols
-- 		FROM (
-- 			DESCRIBE (
-- 				SELECT *
-- 				FROM read_csv(
-- 					'node_modules/sample-gtfs-feed/gtfs/shapes.txt',
-- 					header = true
-- 				)
-- 			)
-- 		) columns
-- 	),
--	-- todo: explicitly specify if we want materialization!
--	-- see also https://github.com/duckdb/duckdb/pull/17459
-- 	table_columns AS (
-- 		SELECT list(column_name)
-- 		FROM (
-- 			DESCRIBE shapes
-- 		) columns
-- 	)
-- SELECT COLUMNS(x -> x IN (SELECT cols FROM csv_columns))
SELECT
	any_value(shape_id) AS shape_id,
	ST_MakeLine(array_agg(ST_Point(shape_pt_lon, shape_pt_lat))) AS shape,
	${has_shape_dist_traveled ? `array_agg(shape_dist_traveled)` : `NULL`} AS distances_travelled
FROM (
	SELECT *
	FROM read_csv(
		'${pathToShapes}',
		header = true,
		-- > This option allows you to specify the types that the sniffer will use when detecting CSV column types.
		-- > default: SQLNULL, BOOLEAN, BIGINT, DOUBLE, TIME, DATE, TIMESTAMP, VARCHAR
		-- We omit BOOLEAN because GTFS just uses integers for boolean-like fields (e.g. timepoint in trips.txt).
		-- We omit DATE/TIME/TIMESTAMP because GTFS formats them differently.
		auto_type_candidates = ['NULL', 'BIGINT', 'DOUBLE', 'VARCHAR']
	)
	ORDER BY shape_id, shape_pt_sequence
) t
GROUP BY shape_id;
`)

	await db[RUN](`\
-- For a primary key, DuckDB doesn't create an index automatically.
CREATE UNIQUE INDEX shapes_shape_id ON shapes(shape_id);
`)

	// Note: This is not the number of shapes.txt rows!
	workingState.nrOfRowsByName.set('shapes', nrOfShapes)
}

module.exports = importData
