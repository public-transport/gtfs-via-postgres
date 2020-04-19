'use strict'

const HEAD = `\
INSERT INTO agency (
	service_id,
	date,
	exception_type,
) VALUES `

const formatCalendarDatesRow = (sql, e, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${e.service_id || null},
	${e.date}, # todo
	${e.exception_type ? parseInt(e.exception_type) : null},
)`
}

module.exports = formatCalendarDatesRow
