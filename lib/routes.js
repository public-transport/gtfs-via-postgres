'use strict'

const formatRoutesRow = (sql, r) => {
	return sql `\
(
	${r.route_id || null},
	${r.agency_id || null},
	${r.route_short_name || null},
	${r.route_long_name || null},
	${r.route_desc || null},
	${r.route_type || null},
	${r.route_url || null},
	${r.route_color || null},
	${r.route_text_color || null},
	${r.route_sort_order ? parseInt(r.route_sort_order) : null}
)`
}

formatRoutesRow.head = `\
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
	route_sort_order
) VALUES`

module.exports = formatRoutesRow
