'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatTripsRow = (t) => {
		return sql `
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
) VALUES (
	${t.trip_id},
	${t.route_id},
	${t.service_id},
	${t.trip_headsign},
	${t.trip_short_name},
	${t.direction_id},
	${t.block_id},
	${t.shape_id},
	${t.wheelchair_accessible},
	${t.bikes_allowed},
)`
	}
	return formatTripsRow
}

module.exports = create
