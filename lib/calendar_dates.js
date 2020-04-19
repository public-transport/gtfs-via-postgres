'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatCalendarDatesRow = (e) => {
		return sql `
INSERT INTO agency (
	service_id,
	date,
	exception_type,
) VALUES (
	${e.service_id},
	${e.date},
	${e.exception_type},
)`
	}
	return formatCalendarDatesRow
}

module.exports = create
