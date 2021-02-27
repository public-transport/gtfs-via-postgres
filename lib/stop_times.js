'use strict'

const {formatTime} = require('./util')

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

CREATE TABLE stop_times (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	-- https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6
	arrival_time interval,
	departure_time interval,
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES stops,
	stop_sequence INT NOT NULL,
	stop_headsign TEXT,
	pickup_type pickup_drop_off_type,
	drop_off_type pickup_drop_off_type,
	shape_dist_traveled REAL,
	timepoint timepoint_v
);

COPY stop_times (
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
) FROM STDIN csv;
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

const formatStopTimesRow = (s) => {
	const arrTime = s.arrival_time
		? formatTime(s.arrival_time)
		: null
	const depTime = s.departure_time
		? formatTime(s.departure_time)
		: null

	return [
		s.trip_id || null,
		arrTime,
		depTime,
		s.stop_id || null,
		s.stop_sequence ? parseInt(s.stop_sequence) : null,
		s.stop_headsign || null,
		s.pickup_type ? pickupDropOffType(s.pickup_type) : null,
		s.drop_off_type ? pickupDropOffType(s.drop_off_type) : null,
		s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null,
		s.timepoint ? timepoint(s.timepoint) : null,
	]
}

const afterAll = `\
\\.

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
	service_days.t_base,
	(
		make_timestamptz(
			date_part('year', "date")::int,
			date_part('month', "date")::int,
			date_part('day', "date")::int,
			12, 0, 0,
			-- todo: take timezone from GTFS feed or config
			'Europe/Berlin'
		)
		- interval '12 hours'
		+ arrival_time
	) t_arrival,
	(
		make_timestamptz(
			date_part('year', "date")::int,
			date_part('month', "date")::int,
			date_part('day', "date")::int,
			12, 0, 0,
			-- todo: take timezone from GTFS feed or config
			'Europe/Berlin'
		)
		- interval '12 hours'
		+ departure_time
	) t_departure,
	s.stop_id, stops.stop_name,
	stations.stop_id station_id, stations.stop_name station_name
FROM (
	stop_times s
	JOIN stops ON s.stop_id = stops.stop_id
	LEFT JOIN stops stations ON stops.parent_station = stations.stop_id
	JOIN trips ON s.trip_id = trips.trip_id
	JOIN routes ON trips.route_id = routes.route_id
	JOIN service_days ON trips.service_id = service_days.service_id
)
ORDER BY route_id, s.trip_id, "date", stop_sequence;
`

module.exports = {
	beforeAll,
	formatRow: formatStopTimesRow,
	afterAll,
}
