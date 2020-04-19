'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatAgencyRow = (a) => {
		return sql `
INSERT INTO agency (
	agency_id,
	agency_name,
	agency_url,
	agency_timezone,
	agency_lang,
	agency_phone,
	agency_fare_url,
	agency_email,
) VALUES (
	${a.agency_id},
	${a.agency_name},
	${a.agency_url},
	${a.agency_timezone},
	${a.agency_lang},
	${a.agency_phone},
	${a.agency_fare_url},
	${a.agency_email},
)`
	}
	return formatAgencyRow
}

module.exports = create
