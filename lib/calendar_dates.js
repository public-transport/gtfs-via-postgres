'use strict'

const exceptionType = (val) => {
	if (val === '1') return 'added'
	if (val === '2') return 'removed'
	throw new Error('invalid exception_type: ' + val)
}

const formatCalendarDatesRow = (sql, e) => {
	return sql `\
(
	${e.service_id || null},
	${e.date}, -- todo
	${e.exception_type ? exceptionType(e.exception_type) : null}
)`
}

formatCalendarDatesRow.head = `\
INSERT INTO calendar_dates (
	service_id,
	date,
	exception_type
) VALUES`

module.exports = formatCalendarDatesRow
