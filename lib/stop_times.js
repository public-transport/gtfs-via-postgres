'use strict'

const {formatTime} = require('./util')

// https://developers.google.com/transit/gtfs/reference#stop_timestxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".pickup_drop_off_type AS ENUM (
	'regular' -- 0 or empty - Regularly scheduled pickup/dropoff.
	, 'not_available' -- 1 – No pickup/dropoff available.
	, 'call' -- 2 – Must phone agency to arrange pickup/dropoff.
	, 'driver' -- 3 – Must coordinate with driver to arrange pickup/dropoff.
);

CREATE TYPE "${opt.schema}".timepoint_v AS ENUM (
	'approximate' -- 0 – Times are considered approximate.
	, 'exact' -- 1 or empty - Times are considered exact.
);

CREATE TABLE "${opt.schema}".stop_times (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES "${opt.schema}".trips,
	-- https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6
	arrival_time interval,
	departure_time interval,
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES "${opt.schema}".stops,
	stop_sequence INT NOT NULL,
	stop_sequence_consec INT,
	stop_headsign TEXT,
	pickup_type "${opt.schema}".pickup_drop_off_type,
	drop_off_type "${opt.schema}".pickup_drop_off_type,
	shape_dist_traveled REAL,
	timepoint "${opt.schema}".timepoint_v
);

COPY "${opt.schema}".stop_times (
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

const afterAll = (opt) => `\
\\.

CREATE INDEX ON "${opt.schema}".stop_times (trip_id);
CREATE INDEX ON "${opt.schema}".stop_times (stop_id);

UPDATE "${opt.schema}".stop_times
SET stop_sequence_consec = t.seq
FROM (
	SELECT
		row_number() OVER (PARTITION BY trip_id ORDER BY stop_sequence ASC) - 1 AS seq,
		trip_id, stop_sequence
	FROM "${opt.schema}".stop_times
) AS t
WHERE "${opt.schema}".stop_times.trip_id = t.trip_id
AND "${opt.schema}".stop_times.stop_sequence = t.stop_sequence;

CREATE INDEX ON "${opt.schema}".stop_times (stop_sequence_consec);
CREATE INDEX ON "${opt.schema}".stop_times (trip_id, stop_sequence_consec);
CREATE INDEX ON "${opt.schema}".stop_times (arrival_time);
CREATE INDEX ON "${opt.schema}".stop_times (departure_time);

CREATE OR REPLACE VIEW "${opt.schema}".arrivals_departures AS
WITH stop_times_based AS NOT MATERIALIZED (
	SELECT
		trips.route_id,
		route_short_name,
		route_long_name,
		route_type,
		s.trip_id,
		trips.direction_id,
		trips.trip_headsign,
		service_days.service_id,
		trips.shape_id,
		"date",
		stop_sequence,
		stop_headsign,
		pickup_type,
		drop_off_type,
		shape_dist_traveled,
		timepoint,
		coalesce(stations.stop_timezone, stops.stop_timezone, agency.agency_timezone) as tz,
		arrival_time,
		(
			make_timestamptz(
				date_part('year', "date")::int,
				date_part('month', "date")::int,
				date_part('day', "date")::int,
				12, 0, 0,
				coalesce(stations.stop_timezone, stops.stop_timezone, agency.agency_timezone)
			)
			- interval '12 hours'
			+ arrival_time
		) t_arrival,
		departure_time,
		(
			make_timestamptz(
				date_part('year', "date")::int,
				date_part('month', "date")::int,
				date_part('day', "date")::int,
				12, 0, 0,
				coalesce(stations.stop_timezone, stops.stop_timezone, agency.agency_timezone)
			)
			- interval '12 hours'
			+ departure_time
		) t_departure,
		s.stop_id, stops.stop_name,
		stations.stop_id station_id, stations.stop_name station_name
	FROM (
		"${opt.schema}".stop_times s
		JOIN "${opt.schema}".stops ON s.stop_id = stops.stop_id
		LEFT JOIN "${opt.schema}".stops stations ON stops.parent_station = stations.stop_id
		JOIN "${opt.schema}".trips ON s.trip_id = trips.trip_id
		JOIN "${opt.schema}".routes ON trips.route_id = routes.route_id
		LEFT JOIN "${opt.schema}".agency ON routes.agency_id = agency.agency_id
		JOIN "${opt.schema}".service_days ON trips.service_id = service_days.service_id
	)
	-- todo: this slows down slightly
	-- ORDER BY route_id, s.trip_id, "date", stop_sequence
)
-- stop_times-based arrivals/departures
SELECT *
FROM stop_times_based
UNION ALL
-- frequencies-based arrivals/departures
SELECT
	-- all columns except t_arrival & t_departure, duh
	-- todo: find a way to use all columns without explicitly enumerating them here
	route_id, route_short_name, route_long_name, route_type,
	trip_id, direction_id, trip_headsign,
	service_id,
	shape_id,
	"date",
	stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint,
	tz,
	arrival_time, -- todo [breaking]: this is misleading, remove it
	generate_series(
		t_arrival - stop_times_offset + start_time,
		t_arrival - stop_times_offset + end_time,
		interval '1 second' * headway_secs
	) as t_arrival,
	departure_time, -- todo [breaking]: this is misleading, remove it
	generate_series(
		t_departure - stop_times_offset + start_time,
		t_departure - stop_times_offset + end_time,
		interval '1 second' * headway_secs
	) as t_departure,
	stop_id, stop_name,
	station_id, station_name
FROM (
	SELECT
		stop_times_based.*,
		frequencies.start_time,
		frequencies.end_time,
		frequencies.headway_secs,
		-- todo: is frequencies.txt relative to 1st arrival_time or departure_time?
		coalesce(
			first_value(departure_time) OVER (PARTITION BY stop_times_based.trip_id, "date" ORDER BY stop_sequence),
			first_value(arrival_time) OVER (PARTITION BY stop_times_based.trip_id, "date" ORDER BY stop_sequence)
		) as stop_times_offset
	FROM stop_times_based
	JOIN "${opt.schema}".frequencies ON frequencies.trip_id = stop_times_based.trip_id
	WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
) frequencies_based;

CREATE OR REPLACE VIEW "${opt.schema}".connections AS
WITH stop_times_based AS NOT MATERIALIZED (
	SELECT
		route_id,
		route_short_name,
		route_long_name,
		route_type,
		trip_id,
		trips.service_id,
		trips.direction_id,
		trips.trip_headsign,

		from_stop_id,
		from_stop_name,
		from_station_id,
		from_station_name,

		from_stop_headsign,
		from_pickup_type,
		make_timestamptz(
			date_part('year'::text, "date")::integer,
			date_part('month'::text, "date")::integer,
			date_part('day'::text, "date")::integer,
			12, 0, 0::double precision,
			coalesce(from_station_tz, from_stop_tz, agency_timezone)
		) - '12:00:00'::interval + departure_time AS t_departure,
		departure_time,
		from_stop_sequence,
		from_timepoint,
		"date",
		to_timepoint,
		to_stop_sequence,
		make_timestamptz(
			date_part('year'::text, "date")::integer,
			date_part('month'::text, "date")::integer,
			date_part('day'::text, "date")::integer,
			12, 0, 0::double precision,
			coalesce(to_station_tz, to_stop_tz, agency_timezone)
		) - '12:00:00'::interval + arrival_time AS t_arrival,
		arrival_time,
		to_drop_off_type,
		to_stop_headsign,

		to_stop_id,
		to_stop_name,
		to_station_id,
		to_station_name
	FROM (
		SELECT
			trips.route_id,
			route_short_name,
			route_long_name,
			route_type,
			stop_times.trip_id, -- not using trips.trip_id here for the query optimizer
			trips.service_id,
			trips.direction_id,
			trips.trip_headsign,
			agency.agency_timezone,

			from_stops.stop_id as from_stop_id,
			from_stops.stop_name as from_stop_name,
			from_stops.stop_timezone as from_stop_tz,
			from_stations.stop_id as from_station_id,
			from_stations.stop_name as from_station_name,
			from_stations.stop_timezone as from_station_tz,
			stop_times.stop_headsign as from_stop_headsign,
			stop_times.pickup_type as from_pickup_type,
			stop_times.departure_time as departure_time,
			stop_times.stop_sequence as from_stop_sequence,
			stop_times.timepoint as from_timepoint,

			to_stop_times.timepoint as to_timepoint,
			to_stop_times.stop_sequence as to_stop_sequence,
			to_stop_times.arrival_time as arrival_time,
			to_stop_times.drop_off_type as to_drop_off_type,
			to_stop_times.stop_headsign as to_stop_headsign,
			to_stop_times.stop_id as to_stop_id,
			to_stops.stop_name as to_stop_name,
			to_stops.stop_timezone as to_stop_tz,
			to_stations.stop_id as to_station_id,
			to_stations.stop_name as to_station_name,
			to_stations.stop_timezone as to_station_tz
		FROM "${opt.schema}".trips
		LEFT JOIN "${opt.schema}".routes ON trips.route_id = routes.route_id
		LEFT JOIN "${opt.schema}".agency ON routes.agency_id = agency.agency_id
		LEFT JOIN "${opt.schema}".stop_times ON trips.trip_id = stop_times.trip_id
		LEFT JOIN "${opt.schema}".stops from_stops ON stop_times.stop_id = from_stops.stop_id
		LEFT JOIN "${opt.schema}".stops from_stations ON from_stops.parent_station = from_stations.stop_id
		INNER JOIN "${opt.schema}".stop_times to_stop_times ON stop_times.trip_id = to_stop_times.trip_id AND stop_times.stop_sequence_consec + 1 = to_stop_times.stop_sequence_consec
		INNER JOIN "${opt.schema}".stops to_stops ON to_stop_times.stop_id = to_stops.stop_id
		LEFT JOIN "${opt.schema}".stops to_stations ON to_stops.parent_station = to_stations.stop_id
	) trips
	JOIN (
		SELECT *
		FROM "${opt.schema}".service_days
		ORDER BY service_id, "date"
	) service_days ON trips.service_id = service_days.service_id
)
-- stop_times-based connections
SELECT *
FROM stop_times_based
UNION ALL
-- frequencies-based connections
SELECT
	-- all columns except t_arrival & t_departure, duh
	route_id, route_short_name, route_long_name, route_type,
	trip_id,
	service_id,
	direction_id,
	trip_headsign,

	from_stop_id,
	from_stop_name,
	from_station_id,
	from_station_name,

	from_stop_headsign,
	from_pickup_type,
	generate_series(
		t_departure - stop_times_offset + start_time,
		t_departure - stop_times_offset + end_time,
		interval '1 second' * headway_secs
	) as t_departure,
	departure_time, -- todo [breaking]: this is misleading, remove it
	from_stop_sequence,
	from_timepoint,

	"date",

	to_timepoint,
	to_stop_sequence,
	generate_series(
		t_arrival - stop_times_offset + start_time,
		t_arrival - stop_times_offset + end_time,
		interval '1 second' * headway_secs
	) as t_arrival,
	arrival_time, -- todo [breaking]: this is misleading, remove it
	to_drop_off_type,
	to_stop_headsign,

	to_stop_id,
	to_stop_name,
	to_station_id,
	to_station_name
FROM (
	SELECT
		stop_times_based.*,
		frequencies.start_time,
		frequencies.end_time,
		frequencies.headway_secs,
		first_value(departure_time) OVER (PARTITION BY stop_times_based.trip_id, "date" ORDER BY from_stop_sequence) as stop_times_offset
	FROM stop_times_based
	JOIN "${opt.schema}".frequencies ON frequencies.trip_id = stop_times_based.trip_id
	WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
) frequencies_based;
`




module.exports = {
	beforeAll,
	formatRow: formatStopTimesRow,
	afterAll,
}
