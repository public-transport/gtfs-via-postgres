'use strict'

const availability = (val) => {
	if (val === '1') return 'not_available'
	if (val === '0') return 'available'
	throw new Error('invalid availability: ' + val)
}

const formatCalendarRow = (sql, c) => {
	return sql `\
(
	${c.service_id || null},
	${c.monday ? availability(c.monday) : null},
	${c.tuesday ? availability(c.tuesday) : null},
	${c.wednesday ? availability(c.wednesday) : null},
	${c.thursday ? availability(c.thursday) : null},
	${c.friday ? availability(c.friday) : null},
	${c.saturday ? availability(c.saturday) : null},
	${c.sunday ? availability(c.sunday) : null},
	${c.start_date}, -- todo
	${c.end_date} -- todo
)`
}

formatCalendarRow.head = `\
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
	end_date
) VALUES`

module.exports = formatCalendarRow
