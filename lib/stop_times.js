'use strict'

const parseTime = require('gtfs-utils/parse-time')

const pickupDropOffType = (val) => {
	if (val === '0') return 'regular'
	if (val === '1') return 'not_available'
	if (val === '2') return 'call'
	if (val === '3') return 'driver'
	throw new Error('invalid/unsupported pickup_type/drop_off_type: ' + val)
}

const timepoint = (val) => {
	if (val === '0') return 'approximate'
	if (val === '1') return 'exact'
	throw new Error('invalid/unsupported timepoint_v: ' + val)
}

const formatStopTimesRow = (sql, s) => {
	let arrDaysOffset = null, arrTime = null
	if (s.arrival_time) {
		const {hours, minutes, seconds} = parseTime(s.arrival_time)
		arrDaysOffset = Math.floor(hours / 24)
		arrTime = `${hours % 24}:${minutes}:${seconds}`
	}
	let depDaysOffset = null, depTime = null
	if (s.departure_time) {
		const {hours, minutes, seconds} = parseTime(s.departure_time)
		depDaysOffset = Math.floor(hours / 24)
		depTime = `${hours % 24}:${minutes}:${seconds}`
	}

	return sql `\
(
	${s.trip_id || null},
	${arrDaysOffset},
	${arrTime},
	${depDaysOffset},
	${depTime},
	${s.stop_id || null},
	${s.stop_sequence ? parseInt(s.stop_sequence) : null},
	${s.stop_headsign || null},
	${s.pickup_type ? pickupDropOffType(s.pickup_type) : null},
	${s.drop_off_type ? pickupDropOffType(s.drop_off_type) : null},
	${s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null},
	${s.timepoint ? timepoint(s.timepoint) : null}
)`
}

formatStopTimesRow.head = `\
INSERT INTO stop_times (
	trip_id,
	arrival_time.days_offset,
	arrival_time."time",
	departure_time.days_offset,
	departure_time."time",
	stop_id,
	stop_sequence,
	stop_headsign,
	pickup_type,
	drop_off_type,
	shape_dist_traveled,
	timepoint
) VALUES`

module.exports = formatStopTimesRow
