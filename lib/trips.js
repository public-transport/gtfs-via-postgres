'use strict'

const HEAD = `
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
	bikes_allowed,
) VALUES `

const formatTripsRow = (sql, t, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${t.trip_id || null},
	${t.route_id || null},
	${t.service_id || null},
	${t.trip_headsign || null},
	${t.trip_short_name || null},
	${t.direction_id ? parseInt(t.direction_id) : null},
	${t.block_id || null},
	${t.shape_id || null},
	${t.wheelchair_accessible ? parseInt(t.wheelchair_accessible) : null},
	${t.bikes_allowed ? parseInt(t.bikes_allowed) : null},
)`
}

module.exports = formatTripsRow
