'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatStopTimesRow = (s) => {
		return sql `
INSERT INTO stop_times (
	trip_id,
	arrival_time,
	departure_time,
	stop_id,
	stop_sequence,
	stop_headsign,
	pickup_type,
	drop_off_type,
	shape_dist_traveled,
	timepoint,
) VALUES (
	${s.trip_id},
	${s.arrival_time},
	${s.departure_time},
	${s.stop_id},
	${s.stop_sequence},
	${s.stop_headsign},
	${s.pickup_type},
	${s.drop_off_type},
	${s.shape_dist_traveled},
	${s.timepoint},
)`
	}
	return formatStopTimesRow
}

module.exports = create
