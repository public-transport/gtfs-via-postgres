'use strict'

const {formatTime} = require('./util')

// https://gtfs.org/schedule/reference/#stop_timestxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".pickup_drop_off_type AS ENUM (
	'regular' -- 0 or empty - Regularly scheduled pickup/dropoff.
	, 'not_available' -- 1 – No pickup/dropoff available.
	, 'call' -- 2 – Must phone agency to arrange pickup/dropoff.
	, 'driver' -- 3 – Must coordinate with driver to arrange pickup/dropoff.
);
CREATE CAST ("${opt.schema}".pickup_drop_off_type AS text) WITH INOUT AS IMPLICIT;

CREATE TYPE "${opt.schema}".timepoint_v AS ENUM (
	'approximate' -- 0 – Times are considered approximate.
	, 'exact' -- 1 or empty - Times are considered exact.
);
CREATE CAST ("${opt.schema}".timepoint_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".stop_times (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES "${opt.schema}".trips,
	-- https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6
	arrival_time INTERVAL,
	departure_time INTERVAL,
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES "${opt.schema}".stops,
	stop_sequence INT NOT NULL,
	stop_sequence_consec INT,
	stop_headsign TEXT,
	pickup_type "${opt.schema}".pickup_drop_off_type,
	drop_off_type "${opt.schema}".pickup_drop_off_type,
	shape_dist_traveled REAL,
	timepoint "${opt.schema}".timepoint_v,
	-- Used to implement frequencies.txt. Filled after COPY-ing, see below.
	trip_start_time INTERVAL
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
		s.shape_dist_traveled || null,
		s.timepoint ? timepoint(s.timepoint) : null,
	]
}

const afterAll = (opt) => `\
\\.

-- trip_start_time is used to implement frequencies.txt.
UPDATE "${opt.schema}".stop_times
-- This is ugly, but AFAICT there is no cleaner way.
-- see also https://stackoverflow.com/a/4359354/1072129
SET trip_start_time = t.trip_start_time
FROM (
	SELECT
		-- todo: is frequencies.txt relative to 1st arrival_time or departure_time?
		coalesce(
			first_value(departure_time) OVER (PARTITION BY trip_id ORDER BY stop_sequence),
			first_value(arrival_time) OVER (PARTITION BY trip_id ORDER BY stop_sequence)
		) AS trip_start_time,
		trip_id, stop_sequence
	FROM "${opt.schema}".stop_times
) AS t
-- self-join
WHERE stop_times.trip_id = t.trip_id
AND stop_times.stop_sequence = t.stop_sequence;

CREATE INDEX ON "${opt.schema}".stop_times (trip_id);
CREATE INDEX ON "${opt.schema}".stop_times (stop_id);

${opt.postgraphile ? `\
COMMENT ON COLUMN "${opt.schema}".stop_times.stop_sequence_consec IS E'@name stopSequenceConsecutive';
` : ''}

UPDATE "${opt.schema}".stop_times
SET stop_sequence_consec = t.seq
FROM (
	SELECT
		row_number() OVER (PARTITION BY trip_id ORDER BY stop_sequence ASC)::integer - 1 AS seq,
		trip_id, stop_sequence
	FROM "${opt.schema}".stop_times
) AS t
WHERE "${opt.schema}".stop_times.trip_id = t.trip_id
AND "${opt.schema}".stop_times.stop_sequence = t.stop_sequence;

CREATE INDEX ON "${opt.schema}".stop_times (stop_sequence_consec);
CREATE INDEX ON "${opt.schema}".stop_times (trip_id, stop_sequence_consec);
CREATE INDEX ON "${opt.schema}".stop_times (arrival_time DESC NULLS LAST);
CREATE INDEX ON "${opt.schema}".stop_times (departure_time DESC NULLS LAST);
-- todo: are these two necessary?
CREATE INDEX ON "${opt.schema}".stop_times (arrival_time);
CREATE INDEX ON "${opt.schema}".stop_times (departure_time);

CREATE OR REPLACE FUNCTION "${opt.schema}".largest_departure_time ()
RETURNS interval AS $$
	SELECT departure_time
	FROM "${opt.schema}".stop_times
	WHERE EXISTS (
		SELECT *
		FROM "${opt.schema}".trips
		JOIN "${opt.schema}".service_days ON service_days.service_id = trips.service_id
		WHERE trips.trip_id = stop_times.trip_id
	)
	ORDER BY departure_time DESC NULLS LAST
	LIMIT 1;
$$ LANGUAGE SQL IMMUTABLE;
CREATE OR REPLACE FUNCTION "${opt.schema}".largest_arrival_time ()
RETURNS interval AS $$
	SELECT arrival_time
	FROM "${opt.schema}".stop_times
	WHERE EXISTS (
		SELECT *
		FROM "${opt.schema}".trips
		JOIN "${opt.schema}".service_days ON service_days.service_id = trips.service_id
		WHERE trips.trip_id = stop_times.trip_id
	)
	ORDER BY arrival_time DESC NULLS LAST
	LIMIT 1;
$$ LANGUAGE SQL IMMUTABLE;
CREATE OR REPLACE FUNCTION "${opt.schema}".dates_filter_min (
	_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS date AS $$
	SELECT date_trunc(
		'day',
		_timestamp
		- GREATEST(
			"${opt.schema}".largest_arrival_time(),
			"${opt.schema}".largest_departure_time()
		)
		-- we assume the DST <-> standard time shift is always <= 1h
		- '1 hour 1 second'::interval
	);
$$ LANGUAGE SQL IMMUTABLE;
-- This function doesn't do much, we just provide it to match date_filter_min().
CREATE OR REPLACE FUNCTION "${opt.schema}".dates_filter_max (
	_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS date AS $$
	SELECT date_trunc('day', _timestamp);
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE VIEW "${opt.schema}".arrivals_departures AS
WITH stop_times_based AS NOT MATERIALIZED (
	SELECT
		agency.agency_id,
		trips.route_id,
		route_short_name,
		route_long_name,
		route_type,
		s.trip_id,
		trips.direction_id,
		trips.trip_headsign,
		trips.wheelchair_accessible,
		trips.bikes_allowed,
		service_days.service_id,
		trips.shape_id,
		"date",
		stop_sequence,
		stop_sequence_consec,
		stop_headsign,
		pickup_type,
		drop_off_type,
		shape_dist_traveled,
		timepoint,
		agency.agency_timezone as tz,
		arrival_time,
		(
			make_timestamptz(
				date_part('year', "date")::int,
				date_part('month', "date")::int,
				date_part('day', "date")::int,
				12, 0, 0,
				agency.agency_timezone
			)
			- INTERVAL '12 hours'
			+ arrival_time
		) t_arrival,
		departure_time,
		(
			make_timestamptz(
				date_part('year', "date")::int,
				date_part('month', "date")::int,
				date_part('day', "date")::int,
				12, 0, 0,
				agency.agency_timezone
			)
			- INTERVAL '12 hours'
			+ departure_time
		) t_departure,
		trip_start_time,
		s.stop_id, stops.stop_name,
		stations.stop_id station_id, stations.stop_name station_name,
		-- todo: PR #47
		coalesce(
			nullif(stops.wheelchair_boarding, 'no_info_or_inherit'),
			nullif(stations.wheelchair_boarding, 'no_info_or_inherit'),
			'no_info_or_inherit'
		) AS wheelchair_boarding
	FROM (
		"${opt.schema}".stop_times s
		JOIN "${opt.schema}".stops ON s.stop_id = stops.stop_id
		LEFT JOIN "${opt.schema}".stops stations ON stops.parent_station = stations.stop_id
		JOIN "${opt.schema}".trips ON s.trip_id = trips.trip_id
		JOIN "${opt.schema}".routes ON trips.route_id = routes.route_id
		LEFT JOIN "${opt.schema}".agency ON (
			-- The GTFS spec allows routes.agency_id to be NULL if there is exactly one agency in the feed.
			-- Note: We implicitly rely on other parts of the code base to validate that agency has just one row!
			-- It seems that GTFS has allowed this at least since 2016:
			-- https://github.com/google/transit/blame/217e9bf/gtfs/spec/en/reference.md#L544-L554
			routes.agency_id IS NULL -- match first (and only) agency
			OR routes.agency_id = agency.agency_id -- match by ID
		)
		JOIN "${opt.schema}".service_days ON trips.service_id = service_days.service_id
	)
	-- todo: this slows down slightly
	-- ORDER BY route_id, s.trip_id, "date", stop_sequence
)
-- stop_times-based arrivals/departures
SELECT
	(
		encode(trip_id::bytea, 'base64')
		|| ':' || encode((
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		)::bytea, 'base64')
		|| ':' || encode((stop_sequence::text)::bytea, 'base64')
		-- frequencies_row
		|| ':' || encode('-1'::bytea, 'base64')
		-- frequencies_it
		|| ':' || encode('-1'::bytea, 'base64')
	) as arrival_departure_id,

	stop_times_based.*,
	-- todo: expose local arrival/departure "wall clock time"?

	-1 AS frequencies_row,
	-1 AS frequencies_it
FROM stop_times_based
UNION ALL
-- frequencies-based arrivals/departures
SELECT
	(
		encode(trip_id::bytea, 'base64')
		|| ':' || encode((
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		)::bytea, 'base64')
		|| ':' || encode((stop_sequence::text)::bytea, 'base64')
		|| ':' || encode((frequencies_row::text)::bytea, 'base64')
		|| ':' || encode((frequencies_it::text)::bytea, 'base64')
	) as arrival_departure_id,
	*
FROM (
SELECT
	*,
	row_number() OVER (PARTITION BY trip_id, "date", frequencies_row, stop_sequence_consec ORDER BY t_departure ASC)::integer AS frequencies_it
FROM (
SELECT
	-- stop_times_based.* except t_arrival & t_departure, duh
	-- todo: find a way to use all columns without explicitly enumerating them here
	agency_id,
	route_id, route_short_name, route_long_name, route_type,
	trip_id, direction_id, trip_headsign, wheelchair_accessible, bikes_allowed,
	service_id,
	shape_id,
	"date",
	stop_sequence, stop_sequence_consec,
	stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint,
	tz,
	arrival_time, -- todo [breaking]: this is misleading, remove it
	generate_series(
		t_arrival - trip_start_time + start_time,
		t_arrival - trip_start_time + end_time,
		INTERVAL '1 second' * headway_secs
	) as t_arrival,
	departure_time, -- todo [breaking]: this is misleading, remove it
	generate_series(
		t_departure - trip_start_time + start_time,
		t_departure - trip_start_time + end_time,
		INTERVAL '1 second' * headway_secs
	) as t_departure,
	trip_start_time,
	stop_id, stop_name,
	station_id, station_name,
	wheelchair_boarding,
	frequencies_row
FROM (
	SELECT
		stop_times_based.*,
		frequencies.start_time,
		frequencies.end_time,
		frequencies.headway_secs,
		frequencies_row
	FROM stop_times_based
	JOIN "${opt.schema}".frequencies ON frequencies.trip_id = stop_times_based.trip_id
	WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
) t
) t
) frequencies_based;

CREATE OR REPLACE FUNCTION "${opt.schema}".arrival_departure_by_arrival_departure_id(id TEXT)
RETURNS "${opt.schema}".arrivals_departures
AS $$
	SELECT *
	FROM "${opt.schema}".arrivals_departures
	WHERE trip_id = convert_from(decode(split_part(id, ':', 1), 'base64'), 'UTF-8')::text
	AND "date" = (convert_from(decode(split_part(id, ':', 2), 'base64'), 'UTF-8')::text)::timestamp
	AND stop_sequence = (convert_from(decode(split_part(id, ':', 3), 'base64'), 'UTF-8')::text)::integer
	AND (convert_from(decode(split_part(id, ':', 4), 'base64'), 'UTF-8')::text)::integer = frequencies_row
	AND (convert_from(decode(split_part(id, ':', 5), 'base64'), 'UTF-8')::text)::integer = frequencies_it
	-- todo: what if there are >1 rows?
	LIMIT 1;
$$ LANGUAGE SQL STABLE STRICT;

${opt.postgraphile ? `\
-- todo: currently named arrivalsDeparture, should be arrivalDeparture (but allArrivalsDeparturesList!)
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.route_short_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.route_long_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.route_type IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.direction_id IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.trip_headsign IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.stop_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".arrivals_departures.station_name IS E'@omit';
-- > If you want to rename just one field or type, your best bet is to use a [@name] smart comment […].
-- > NOTE: this still uses the inflectors, but it pretends that the tables name is different, so the input to the inflectors differs.
-- https://www.graphile.org/postgraphile/inflection/#overriding-naming---one-off
COMMENT ON VIEW "${opt.schema}".arrivals_departures IS E'@name arrival_departures\\n@primaryKey trip_id,date,stop_sequence,frequencies_row,frequencies_it\\n@foreignKey (route_id) references routes|@fieldName route\\n@foreignKey (trip_id) references trips|@fieldName trip\\n@foreignKey (stop_id) references stops|@fieldName stop\\n@foreignKey (station_id) references stops|@fieldName station';
` : ''}

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
  		trips.wheelchair_accessible,
		trips.bikes_allowed,
		trip_start_time,

		from_stop_id,
		from_stop_name,
		from_station_id,
		from_station_name,
		from_wheelchair_boarding,

		from_stop_headsign,
		from_pickup_type,
		make_timestamptz(
			date_part('year'::text, "date")::integer,
			date_part('month'::text, "date")::integer,
			date_part('day'::text, "date")::integer,
			12, 0, 0::double precision,
			agency_timezone
		) - '12:00:00'::interval + departure_time AS t_departure,
		departure_time,
		from_stop_sequence,
		from_stop_sequence_consec,
		from_timepoint,
		"date",
		to_timepoint,
		to_stop_sequence,
		to_stop_sequence_consec,
		make_timestamptz(
			date_part('year'::text, "date")::integer,
			date_part('month'::text, "date")::integer,
			date_part('day'::text, "date")::integer,
			12, 0, 0::double precision,
			agency_timezone
		) - '12:00:00'::interval + arrival_time AS t_arrival,
		arrival_time,
		to_drop_off_type,
		to_stop_headsign,

		to_stop_id,
		to_stop_name,
		to_station_id,
		to_station_name,
		to_wheelchair_boarding
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
   			trips.wheelchair_accessible,
			trips.bikes_allowed,
			agency.agency_timezone,
			stop_times.trip_start_time,

			from_stops.stop_id as from_stop_id,
			from_stops.stop_name as from_stop_name,
			from_stations.stop_id as from_station_id,
			from_stations.stop_name as from_station_name,
			-- todo: PR #47
			coalesce(
				nullif(from_stops.wheelchair_boarding, 'no_info_or_inherit'),
				nullif(from_stations.wheelchair_boarding, 'no_info_or_inherit'),
				'no_info_or_inherit'
			) AS from_wheelchair_boarding,

			stop_times.stop_headsign as from_stop_headsign,
			stop_times.pickup_type as from_pickup_type,
			stop_times.departure_time as departure_time,
			stop_times.stop_sequence as from_stop_sequence,
			stop_times.stop_sequence_consec as from_stop_sequence_consec,
			stop_times.timepoint as from_timepoint,

			to_stop_times.timepoint as to_timepoint,
			to_stop_times.stop_sequence as to_stop_sequence,
			to_stop_times.stop_sequence_consec as to_stop_sequence_consec,
			to_stop_times.arrival_time as arrival_time,
			to_stop_times.drop_off_type as to_drop_off_type,
			to_stop_times.stop_headsign as to_stop_headsign,

			to_stop_times.stop_id as to_stop_id,
			to_stops.stop_name as to_stop_name,
			to_stations.stop_id as to_station_id,
			to_stations.stop_name as to_station_name,
			-- todo: PR #47
			coalesce(
				nullif(to_stops.wheelchair_boarding, 'no_info_or_inherit'),
				nullif(to_stations.wheelchair_boarding, 'no_info_or_inherit'),
				'no_info_or_inherit'
			) AS to_wheelchair_boarding
		FROM "${opt.schema}".trips
		LEFT JOIN "${opt.schema}".routes ON trips.route_id = routes.route_id
		LEFT JOIN "${opt.schema}".agency ON (
			-- The GTFS spec allows routes.agency_id to be NULL if there is exactly one agency in the feed.
			-- Note: We implicitly rely on other parts of the code base to validate that agency has just one row!
			-- It seems that GTFS has allowed this at least since 2016:
			-- https://github.com/google/transit/blame/217e9bf/gtfs/spec/en/reference.md#L544-L554
			routes.agency_id IS NULL -- match first (and only) agency
			OR routes.agency_id = agency.agency_id -- match by ID
		)
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
SELECT
	(
		encode(trip_id::bytea, 'base64')
		|| ':' || encode((
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		)::bytea, 'base64')
		|| ':' || encode((from_stop_sequence::text)::bytea, 'base64')
		-- frequencies_row
		|| ':' || encode('-1'::bytea, 'base64')
		-- frequencies_it
		|| ':' || encode('-1'::bytea, 'base64')
	) as connection_id,

	stop_times_based.*,

	-1 AS frequencies_row,
	-1 AS frequencies_it
FROM stop_times_based
UNION ALL
-- frequencies-based connections
SELECT
	(
		encode(trip_id::bytea, 'base64')
		|| ':' || encode((
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		)::bytea, 'base64')
		|| ':' || encode((from_stop_sequence::text)::bytea, 'base64')
		|| ':' || encode((frequencies_row::text)::bytea, 'base64')
		|| ':' || encode((frequencies_it::text)::bytea, 'base64')
	) as connection_id,

	frequencies_based.*
FROM (
SELECT
	*,
	row_number() OVER (PARTITION BY trip_id, "date", frequencies_row, from_stop_sequence_consec ORDER BY t_departure ASC)::integer AS frequencies_it
FROM (
SELECT
	-- stop_times_based.* except t_arrival & t_departure, duh
	-- todo: find a way to use all columns without explicitly enumerating them here
	route_id, route_short_name, route_long_name, route_type,
	trip_id,
	service_id,
	direction_id,
	trip_headsign,
 	wheelchair_accessible,
	bikes_allowed,
	trip_start_time,

	from_stop_id,
	from_stop_name,
	from_station_id,
	from_station_name,
	from_wheelchair_boarding,

	from_stop_headsign,
	from_pickup_type,
	generate_series(
		t_departure - trip_start_time + start_time,
		t_departure - trip_start_time + end_time,
		INTERVAL '1 second' * headway_secs
	) as t_departure,
	departure_time, -- todo [breaking]: this is misleading, remove it
	from_stop_sequence,
	from_stop_sequence_consec,
	from_timepoint,

	"date",

	to_timepoint,
	to_stop_sequence,
	to_stop_sequence_consec,
	generate_series(
		t_arrival - trip_start_time + start_time,
		t_arrival - trip_start_time + end_time,
		INTERVAL '1 second' * headway_secs
	) as t_arrival,
	arrival_time, -- todo [breaking]: this is misleading, remove it
	to_drop_off_type,
	to_stop_headsign,

	to_stop_id,
	to_stop_name,
	to_station_id,
	to_station_name,
	to_wheelchair_boarding,

	frequencies_row
FROM (
	SELECT
		stop_times_based.*,
		frequencies.start_time,
		frequencies.end_time,
		frequencies.headway_secs,
		frequencies_row
	FROM stop_times_based
	JOIN "${opt.schema}".frequencies ON frequencies.trip_id = stop_times_based.trip_id
	WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
) t
) t
) frequencies_based;

CREATE OR REPLACE FUNCTION "${opt.schema}".connection_by_connection_id(id TEXT)
RETURNS "${opt.schema}".connections
AS $$
	SELECT *
	FROM "${opt.schema}".connections
	WHERE trip_id = convert_from(decode(split_part(id, ':', 1), 'base64'), 'UTF-8')::text
	AND "date" = (convert_from(decode(split_part(id, ':', 2), 'base64'), 'UTF-8')::text)::timestamp
	AND from_stop_sequence = (convert_from(decode(split_part(id, ':', 3), 'base64'), 'UTF-8')::text)::integer
	AND (convert_from(decode(split_part(id, ':', 4), 'base64'), 'UTF-8')::text)::integer = frequencies_row
	AND (convert_from(decode(split_part(id, ':', 5), 'base64'), 'UTF-8')::text)::integer = frequencies_it
	-- todo: what if there are >1 rows?
	LIMIT 1;
$$ LANGUAGE SQL STABLE STRICT;

${opt.postgraphile ? `\
-- todo: currently named arrivalsDeparture, should be arrivalDeparture (but allArrivalsDeparturesList!)
-- todo: allow filtering based on stop and/or route and/or trip and/or time frame
-- https://www.graphile.org/postgraphile/functions/#setof-functions---connections
COMMENT ON COLUMN "${opt.schema}".connections.route_short_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.route_long_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.route_type IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.direction_id IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.trip_headsign IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.from_stop_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.from_station_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.to_stop_name IS E'@omit';
COMMENT ON COLUMN "${opt.schema}".connections.to_station_name IS E'@omit';
COMMENT ON VIEW "${opt.schema}".connections IS E'@primaryKey trip_id,date,from_stop_sequence,frequencies_row,frequencies_it\\n@foreignKey (route_id) references routes|@fieldName route\\n@foreignKey (trip_id) references trips|@fieldName trip\\n@foreignKey (from_stop_id) references stops|@fieldName fromStop\\n@foreignKey (from_station_id) references stops|@fieldName fromStation\\n@foreignKey (to_stop_id) references stops|@fieldName toStop\\n@foreignKey (to_station_id) references stops|@fieldName toStation';
` : ''}
`




module.exports = {
	beforeAll,
	formatRow: formatStopTimesRow,
	afterAll,
}
