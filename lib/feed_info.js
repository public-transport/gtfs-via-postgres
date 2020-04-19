'use strict'

const HEAD = `\
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
) VALUES `

const formatAgencyRow = (sql, i, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${i.feed_publisher_name || null},
	${i.feed_publisher_url || null},
	${i.feed_lang || null},
	${i.default_lang || null},
	${i.feed_start_date}, # todo
	${i.feed_end_date}, # todo
	${i.feed_version || null},
	${i.feed_contact_email || null},
	${i.feed_contact_url || null},
)`
}

module.exports = formatAgencyRow
