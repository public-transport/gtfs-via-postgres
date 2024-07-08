'use strict'

const GET = require('./get.js')
const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// https://gtfs.org/schedule/reference/#stop_timestxt
const importData = async (db, pathToStopTimes, opt, workingState) => {
	// timepoint & shape_dist_traveled are optional, so the entire columns can be missing.
	// It seems like, as of DuckDB v1.0.0, there is no way to assign default values to missing columns, neither with read_csv() nor with a nested subquery.
	// This is why we check the file first and then programmatically determine the set of SELECT-ed columns below.
	const [{
		has_shape_dist_traveled,
		has_timepoint,
	}] = await db[GET](`\
		WITH columns AS (
			SELECT *
			FROM (
				DESCRIBE (
					SELECT *
					FROM read_csv(
						'${pathToStopTimes}',
						header = true
					)
					LIMIT 1
				)
			)
		)
		SELECT
			EXISTS(
				SELECT *
				FROM columns
				WHERE column_name = 'timepoint'
			) AS has_timepoint,
			EXISTS(
				SELECT *
				FROM columns
				WHERE column_name = 'shape_dist_traveled'
			) AS has_shape_dist_traveled
`)

	await db[RUN](`\
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
	pickup_type "${opt.schema}".pickup_drop_off_type, -- todo: NOT NULL & ifnull()
	drop_off_type "${opt.schema}".pickup_drop_off_type, -- todo: NOT NULL & ifnull()
	shape_dist_traveled REAL,
	timepoint "${opt.schema}".timepoint_v,
	PRIMARY KEY (trip_id, stop_sequence)
);

INSERT INTO "${opt.schema}".stop_times
-- Matching by name allows the CSV file to have a different set and order of columns.
-- todo: handle the CSV file having *additional* columns
BY NAME
SELECT
	row_number() OVER (PARTITION BY trip_id ORDER BY stop_sequence ASC) AS stop_sequence_consec,
	${has_shape_dist_traveled ? `` : `NULL AS shape_dist_traveled,`}
	${has_timepoint ? `` : `NULL AS timepoint,`}
	*
	REPLACE (
		-- Casting an integer to an enum (using the index) is currently not possible, so we have to compute the availability index by hand using enum_range().
		-- DuckDB array/list indixes are 1-based.
		-- todo: what if these are NULL?
		enum_range(NULL::pickup_drop_off_type)[drop_off_type + 1] AS drop_off_type,
		enum_range(NULL::pickup_drop_off_type)[pickup_type + 1] AS pickup_type
		${has_timepoint ? `,enum_range(NULL::timepoint_v)[timepoint + 1] AS timepoint` : ''}
	)
FROM read_csv(
	'${pathToStopTimes}',
	header = true,
	all_varchar = true,
	types = {
		arrival_time: 'INTERVAL',
		departure_time: 'INTERVAL',
		stop_sequence: 'INTEGER',
		pickup_type: 'INTEGER',
		drop_off_type: 'INTEGER',
		${has_shape_dist_traveled ? `shape_dist_traveled: 'REAL',` : ``}
		${has_timepoint ? `timepoint: 'INTEGER',` : ``}
	}
);

-- todo: are all of them beneficial/necessary?
CREATE INDEX stop_times_trip_id ON "${opt.schema}".stop_times (trip_id);
CREATE INDEX stop_times_stop_id ON "${opt.schema}".stop_times (stop_id);
CREATE INDEX stop_times_stop_sequence_consec ON "${opt.schema}".stop_times (stop_sequence_consec);
CREATE INDEX stop_times_trip_id_stop_sequence_consec ON "${opt.schema}".stop_times (trip_id, stop_sequence_consec);
-- As of DuckDB v1.0.0, indexes on INTERVAL columns are not supported yet.
-- todo: alternatively just change these columns to INTEGER?
-- CREATE INDEX stop_times_arrival_time ON "${opt.schema}".stop_times (arrival_time);
-- CREATE INDEX stop_times_departure_time ON "${opt.schema}".stop_times (departure_time);

-- todo: materialize?
CREATE OR REPLACE VIEW "${opt.schema}".largest_arr_dep_time AS
WITH
	largest_departure_time AS (
		SELECT departure_time
		FROM "${opt.schema}".stop_times
		WHERE EXISTS (
			SELECT *
			FROM "${opt.schema}".trips
			JOIN "${opt.schema}".service_days ON service_days.service_id = trips.service_id
			WHERE trips.trip_id = stop_times.trip_id
		)
		ORDER BY departure_time DESC
		LIMIT 1
	),
	largest_arrival_time AS (
		SELECT arrival_time
		FROM "${opt.schema}".stop_times
		WHERE EXISTS (
			SELECT *
			FROM "${opt.schema}".trips
			JOIN "${opt.schema}".service_days ON service_days.service_id = trips.service_id
			WHERE trips.trip_id = stop_times.trip_id
		)
		ORDER BY arrival_time DESC
		LIMIT 1
	)
SELECT
	to_seconds(greatest(
		epoch(arrival_time),
		epoch(departure_time)
	)) AS largest
FROM largest_departure_time, largest_arrival_time;

-- CREATE OR REPLACE FUNCTION "${opt.schema}".dates_filter_min (
-- 	_timestamp TIMESTAMP WITH TIME ZONE
-- )
-- RETURNS date AS $$
-- 	SELECT date_trunc(
-- 		'day',
-- 		_timestamp
-- 		- GREATEST(
-- 			"${opt.schema}".largest_arrival_time(),
-- 			"${opt.schema}".largest_departure_time()
-- 		)
-- 		-- we assume the DST <-> standard time shift is always <= 1h
-- 		- '1 hour 1 second'::interval
-- 	);
-- $$ LANGUAGE SQL IMMUTABLE;
-- -- This function doesn't do much, we just provide it to match date_filter_min().
-- CREATE OR REPLACE FUNCTION "${opt.schema}".dates_filter_max (
-- 	_timestamp TIMESTAMP WITH TIME ZONE
-- )
-- RETURNS date AS $$
-- 	SELECT date_trunc('day', _timestamp);
-- $$ LANGUAGE SQL IMMUTABLE;

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
		to_base64(encode(trip_id))
		|| ':' || to_base64(encode(
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		))
		|| ':' || to_base64(encode(stop_sequence::text))
		-- frequencies_row
		|| ':' || to_base64(encode('-1'))
		-- frequencies_it
		|| ':' || to_base64(encode('-1'))
	) as arrival_departure_id,

	-- todo: expose local arrival/departure "wall clock time"?

	-1 AS frequencies_row,
	-1 AS frequencies_it,

	stop_times_based.*
	EXCLUDE (
		arrival_time,
		departure_time
	)
FROM stop_times_based
UNION ALL BY NAME
-- frequencies-based arrivals/departures
SELECT
	(
		to_base64(encode(trip_id))
		|| ':' || to_base64(encode(
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		))
		|| ':' || to_base64(encode(stop_sequence::text))
		|| ':' || to_base64(encode(frequencies_row::text))
		|| ':' || to_base64(encode(frequencies_it::text))
	) as arrival_departure_id,

	-- todo
	frequencies_based.*
	EXCLUDE (
		arrival_time,
		departure_time,
		start_time,
		end_time,
		stop_times_offset,
		headway_secs
	)
	REPLACE (
		unnest(generate_series(
			t_arrival - stop_times_offset + start_time,
			t_arrival - stop_times_offset + end_time,
			INTERVAL '1 second' * headway_secs
		)) as t_arrival,
		unnest(generate_series(
			t_departure - stop_times_offset + start_time,
			t_departure - stop_times_offset + end_time,
			INTERVAL '1 second' * headway_secs
		)) as t_departure,
	)
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
		) as stop_times_offset,
		frequencies_row
	FROM stop_times_based
	JOIN (
		SELECT
			*,
			(row_number() OVER (PARTITION BY trip_id, exact_times))::integer as frequencies_row
		FROM "${opt.schema}".frequencies
		WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
	) frequencies ON frequencies.trip_id = stop_times_based.trip_id
) t
) t
) frequencies_based;

-- CREATE OR REPLACE FUNCTION "${opt.schema}".arrival_departure_by_arrival_departure_id(id TEXT)
-- RETURNS "${opt.schema}".arrivals_departures
-- AS $$
-- 	SELECT *
-- 	FROM "${opt.schema}".arrivals_departures
-- 	WHERE trip_id = decode(from_base64(split_part(id, ':', 1)))
-- 	AND "date" = decode(from_base64(split_part(id, ':', 2)))::timestamp
-- 	AND stop_sequence = decode(from_base64(split_part(id, ':', 3)))::integer
-- 	AND decode(from_base64(split_part(id, ':', 4)))::integer = frequencies_row
-- 	AND decode(from_base64(split_part(id, ':', 5)))::integer = frequencies_it
-- 	-- todo: what if there are >1 rows?
-- 	LIMIT 1;
-- $$ LANGUAGE SQL STABLE STRICT;

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
		to_base64(encode(trip_id))
		|| ':' || to_base64(encode(
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		))
		|| ':' || to_base64(encode(from_stop_sequence::text))
		-- frequencies_row
		|| ':' || to_base64(encode('-1'))
		-- frequencies_it
		|| ':' || to_base64(encode('-1'))
	) as connection_id,

	-1 AS frequencies_row,
	-1 AS frequencies_it,

	stop_times_based.*
	EXCLUDE (
		arrival_time,
		departure_time
	)
FROM stop_times_based
UNION ALL BY NAME
-- frequencies-based connections
SELECT
	(
		to_base64(encode(trip_id))
		|| ':' || to_base64(encode(
			extract(ISOYEAR FROM "date")
			|| '-' || lpad(extract(MONTH FROM "date")::text, 2, '0')
			|| '-' || lpad(extract(DAY FROM "date")::text, 2, '0')
		))
		|| ':' || to_base64(encode(from_stop_sequence::text))
		|| ':' || to_base64(encode(frequencies_row::text))
		|| ':' || to_base64(encode(frequencies_it::text))
	) as connection_id,

	-- todo
	frequencies_based.*
	EXCLUDE (
		arrival_time,
		departure_time,
		start_time,
		end_time,
		stop_times_offset,
		headway_secs
	)
	REPLACE (
		unnest(generate_series(
			t_departure - stop_times_offset + start_time,
			t_departure - stop_times_offset + end_time,
			INTERVAL '1 second' * headway_secs
		)) as t_departure,
		unnest(generate_series(
			t_arrival - stop_times_offset + start_time,
			t_arrival - stop_times_offset + end_time,
			INTERVAL '1 second' * headway_secs
		)) as t_arrival
	)
FROM (
	SELECT
		stop_times_based.*,
		frequencies.start_time,
		frequencies.end_time,
		frequencies.headway_secs,
		first_value(departure_time) OVER (PARTITION BY stop_times_based.trip_id, "date" ORDER BY from_stop_sequence) as stop_times_offset,
		frequencies_row,
		(row_number() OVER (PARTITION BY stop_times_based.trip_id, "date", frequencies_row ORDER BY from_stop_sequence))::integer as frequencies_it
	FROM stop_times_based
	JOIN (
		SELECT
			*,
			(row_number() OVER (PARTITION BY trip_id, exact_times))::integer as frequencies_row
		FROM "${opt.schema}".frequencies
		WHERE frequencies.exact_times = 'schedule_based' -- todo: is this correct?
	) frequencies ON frequencies.trip_id = stop_times_based.trip_id
) frequencies_based;

-- CREATE OR REPLACE FUNCTION "${opt.schema}".connection_by_connection_id(id TEXT)
-- RETURNS "${opt.schema}".connections
-- AS $$
-- 	SELECT *
-- 	FROM "${opt.schema}".connections
-- 	WHERE trip_id = decode(from_base64(split_part(id, ':', 1)))
-- 	AND "date" = decode(from_base64(split_part(id, ':', 2)))::timestamp
-- 	AND from_stop_sequence = decode(from_base64(split_part(id, ':', 3)))::integer
-- 	AND decode(from_base64(split_part(id, ':', 4)))::integer = frequencies_row
-- 	AND decode(from_base64(split_part(id, ':', 5)))::integer = frequencies_it
-- 	-- todo: what if there are >1 rows?
-- 	LIMIT 1;
-- $$ LANGUAGE SQL STABLE STRICT;
`)

	workingState.nrOfRowsByName.set('stop_times', await queryNumberOfRows(db, 'stop_times', opt))
}

module.exports = importData
