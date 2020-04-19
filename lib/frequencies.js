'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatFrequenciesRow = (f) => {
		return sql `
INSERT INTO frequencies (
	trip_id,
	start_time,
	end_time,
	headway_secs,
	exact_times,
) VALUES (
	${f.trip_id},
	${f.start_time},
	${f.end_time},
	${f.headway_secs},
	${f.exact_times},
)`
	}
	return formatFrequenciesRow
}

module.exports = create
