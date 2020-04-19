'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatRoutesRow = (r) => {
		return sql `
INSERT INTO routes (
	route_id,
	agency_id,
	route_short_name,
	route_long_name,
	route_desc,
	route_type,
	route_url,
	route_color,
	route_text_color,
	route_sort_order,
) VALUES (
	${r.route_id},
	${r.agency_id},
	${r.route_short_name},
	${r.route_long_name},
	${r.route_desc},
	${r.route_type},
	${r.route_url},
	${r.route_color},
	${r.route_text_color},
	${r.route_sort_order},
)`
	}
	return formatRoutesRow
}

module.exports = create
