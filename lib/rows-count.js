'use strict'

const GET = require('./get.js')

const queryNumberOfRows = async (db, dbName, opt) => {
	const [{count: nrOfRows}] = await db[GET](`
		SELECT count(*) AS count
		FROM "${dbName}"
	`)
	return nrOfRows
}

module.exports = {
	queryNumberOfRows,
}
