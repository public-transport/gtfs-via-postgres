'use strict'

const HEAD = `\
INSERT INTO calendar (
	service_id,
	monday,
	tuesday,
	wednesday,
	thursday,
	friday,
	saturday,
	sunday,
	start_date,
	end_date,
) VALUES `

const formatCalendarRow = (sql, c, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${c.service_id || null},
	${c.monday ? parseInt(c.monday) : null},
	${c.tuesday ? parseInt(c.tuesday) : null},
	${c.wednesday ? parseInt(c.wednesday) : null},
	${c.thursday ? parseInt(c.thursday) : null},
	${c.friday ? parseInt(c.friday) : null},
	${c.saturday ? parseInt(c.saturday) : null},
	${c.sunday ? parseInt(c.sunday) : null},
	${c.start_date}, # todo
	${c.end_date}, # todo
)`
}

module.exports = formatCalendarRow
