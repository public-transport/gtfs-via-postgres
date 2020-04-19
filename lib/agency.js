'use strict'

const formatAgencyRow = (sql, a) => {
	return sql `\
(
	${a.agency_id || null},
	${a.agency_name || null},
	${a.agency_url || null},
	${a.agency_timezone || null},
	${a.agency_lang || null},
	${a.agency_phone || null},
	${a.agency_fare_url || null},
	${a.agency_email || null}
)`
}

formatAgencyRow.head = `\
INSERT INTO agency (
	agency_id,
	agency_name,
	agency_url,
	agency_timezone,
	agency_lang,
	agency_phone,
	agency_fare_url,
	agency_email
) VALUES`

module.exports = formatAgencyRow
