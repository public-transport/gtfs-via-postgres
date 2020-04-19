'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatAgencyRow = (i) => {
		return sql `
INSERT INTO agency (
	feed_publisher_name,
	feed_publisher_url,
	feed_lang,
	default_lang,
	feed_start_date,
	feed_end_date,
	feed_version,
	feed_contact_email,
	feed_contact_url,
) VALUES (
	${i.feed_publisher_name},
	${i.feed_publisher_url},
	${i.feed_lang},
	${i.default_lang},
	${i.feed_start_date},
	${i.feed_end_date},
	${i.feed_version},
	${i.feed_contact_email},
	${i.feed_contact_url},
)`
	}
	return formatAgencyRow
}

module.exports = create
