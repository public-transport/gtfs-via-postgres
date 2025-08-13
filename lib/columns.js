'use strict'

const GET = require('./get.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/documentation/schedule/reference/#stop_timestxt
const queryFileColumns = async (db, pathToFile) => {
	const columns = await db[GET](
		`\
			DESCRIBE (
				SELECT *
				FROM read_csv(
					-- Using a parameter would be the proper & safer approach here, but it crashes DuckDB as of v1.3.2.
					-- $1,
					'${pathToFile}',
					header = true
				)
				LIMIT 1
			)
`,
		// [pathToFile],
	)
	return columns
}

const queryIfColumnsExist = async (db, pathToFile, columns) => {
	const res = Object.create(null)
	const existing = new Set(
		(await queryFileColumns(db, pathToFile))
		.map(col => col.column_name),
	)
	for (const column of columns) {
		res[column] = existing.has(column)
	}
	return res
}

module.exports = {
	queryFileColumns,
	queryIfColumnsExist,
}
