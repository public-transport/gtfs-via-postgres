'use strict'

const {formatTime} = require('./util')

// `stop_times_time` is the same as `frequencies_time`
// todo: DRY: rename to `gtfs_time`, move to a common place
// https://developers.google.com/transit/gtfs/reference#stop_timestxt
const beforeAll = `\
CREATE TYPE pickup_drop_off_type AS ENUM (
	'regular' -- 0 or empty - Regularly scheduled pickup/dropoff.
	, 'not_available' -- 1 – No pickup/dropoff available.
	, 'call' -- 2 – Must phone agency to arrange pickup/dropoff.
	, 'driver' -- 3 – Must coordinate with driver to arrange pickup/dropoff.
);

CREATE TYPE timepoint_v AS ENUM (
	'approximate' -- 0 – Times are considered approximate.
	, 'exact' -- 1 or empty - Times are considered exact.
);

CREATE TYPE stop_times_time AS (
	days_offset SMALLINT,
	"time" TIME
);

CREATE TABLE stop_times (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	-- todo: For times occurring after midnight on the service day, enter the time as a value greater than 24:00:00 in HH:MM:SS local time for the day on which the trip schedule begins.
	arrival_time stop_times_time,
	departure_time stop_times_time,
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES stops,
	stop_sequence INT NOT NULL,
	stop_headsign TEXT,
	pickup_type pickup_drop_off_type,
	drop_off_type pickup_drop_off_type,
	shape_dist_traveled REAL,
	timepoint timepoint_v
);
`

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
		[arrDaysOffset, arrTime] = formatTime(s.arrival_time)
	}
	let depDaysOffset = null, depTime = null
	if (s.departure_time) {
		[depDaysOffset, depTime] = formatTime(s.departure_time)
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

const head = `\
INSERT INTO stop_times (
	trip_id,
	arrival_time.days_offset, arrival_time.time,
	departure_time.days_offset, departure_time.time,
	stop_id,
	stop_sequence,
	stop_headsign,
	pickup_type,
	drop_off_type,
	shape_dist_traveled,
	timepoint
) VALUES`

const afterAll = `\
CREATE INDEX ON stop_times (trip_id);
CREATE INDEX ON stop_times (stop_id);
CREATE INDEX ON stop_times (stop_sequence);
CREATE INDEX ON stop_times (arrival_time);
CREATE INDEX ON stop_times (departure_time);

CREATE VIEW arrivals_departures AS
SELECT
	trips.route_id,
	route_short_name,
	route_type,
	s.trip_id,
	"date",
	stop_sequence,
	"date" AT TIME ZONE 'Europe/Berlin' + make_interval(days => (arrival_time).days_offset) + (arrival_time).time t_arrival,
	"date" AT TIME ZONE 'Europe/Berlin' + make_interval(days => (departure_time).days_offset) + (departure_time).time t_departure,
	s.stop_id, stops.stop_name,
	stations.stop_id station_id, stations.stop_name station_name
FROM (
	stop_times s
	JOIN stops ON s.stop_id = stops.stop_id
	JOIN stops stations ON stops.parent_station = stations.stop_id
	JOIN trips ON s.trip_id = trips.trip_id
	JOIN routes ON trips.route_id = routes.route_id
	JOIN service_days ON trips.service_id = service_days.service_id
)
ORDER BY route_id, s.trip_id, "date", stop_sequence;
`

module.exports = {
	beforeAll,
	head,
	formatRow: formatStopTimesRow,
	afterAll,
}
