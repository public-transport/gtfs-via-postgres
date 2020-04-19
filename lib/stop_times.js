'use strict'

const formatStopTimesRow = (sql, s) => {
	return sql `\
(
	${s.trip_id || null},
	${s.arrival_time}, # todo
	${s.departure_time}, # todo
	${s.stop_id || null},
	${s.stop_sequence ? parseInt(s.stop_sequence) : null},
	${s.stop_headsign || null},
	${s.pickup_type ? parseInt(s.pickup_type) : null},
	${s.drop_off_type ? parseInt(s.drop_off_type) : null},
	${s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null},
	${s.timepoint ? parseInt(s.timepoint) : null}
)`
}

formatStopTimesRow.head = `\
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
	timepoint
) VALUES`

module.exports = formatStopTimesRow
