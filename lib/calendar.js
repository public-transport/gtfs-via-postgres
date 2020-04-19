'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatCalendarRow = (c) => {
		return sql `
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
) VALUES (
	${c.service_id},
	${c.monday},
	${c.tuesday},
	${c.wednesday},
	${c.thursday},
	${c.friday},
	${c.saturday},
	${c.sunday},
	${c.start_date},
	${c.end_date},
)`
	}
	return formatCalendarRow
}

module.exports = create
