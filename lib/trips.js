'use strict'

const wheelchairAccessibility = (val) => {
	if (val === '0') return 'unknown'
	if (val === '1') return 'accessible'
	if (val === '2') return 'not_accessible'
	throw new Error('invalid wheelchair_accessibility: ' + val)
}

const bikesAllowance = (val) => {
	if (val === '0') return 'unknown'
	if (val === '1') return 'allowed'
	if (val === '2') return 'not_allowed'
	throw new Error('invalid bikes_allowance: ' + val)
}

const formatTripsRow = (sql, t) => {
	return sql `\
(
	${t.trip_id || null},
	${t.route_id || null},
	${t.service_id || null},
	${t.trip_headsign || null},
	${t.trip_short_name || null},
	${t.direction_id ? parseInt(t.direction_id) : null},
	${t.block_id || null},
	${t.shape_id || null},
	${t.wheelchair_accessible
		? wheelchairAccessibility(t.wheelchair_accessible)
		: null
	},
	${t.bikes_allowed ? bikesAllowance(t.bikes_allowed) : null}
)`
}

formatTripsRow.head = `\
INSERT INTO trips (
	trip_id,
	route_id,
	service_id,
	trip_headsign,
	trip_short_name,
	direction_id INT,
	block_id,
	shape_id,
	wheelchair_accessible,
	bikes_allowed
) VALUES`

module.exports = formatTripsRow
