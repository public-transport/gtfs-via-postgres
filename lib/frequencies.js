'use strict'

const {formatTime} = require('./util')

// https://gtfs.org/documentation/schedule/reference/#frequenciestxt
const beforeAll = (opt) => `\
CREATE TYPE exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);
CREATE CAST (exact_times_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE frequencies (
	-- Used to implement arrivals_departures & connections. Filled after COPY-ing, see below.
	frequencies_row INTEGER,
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	start_time INTERVAL NOT NULL,
	end_time INTERVAL NOT NULL,
	headway_secs INT NOT NULL,
	exact_times exact_times_v,
	-- frequencies' primary key currently is just (trip_id, start_time)
	-- see also https://github.com/google/transit/issues/514
	-- todo: add primary key?
	UNIQUE (
		trip_id,
		start_time,
		end_time,
		headway_secs,
		exact_times
	)
);

COPY frequencies (
	trip_id,
	start_time,
	end_time,
	headway_secs,
	exact_times
) FROM STDIN csv;
`

const exactTimes = (val) => {
	if (val === '0') return 'frequency_based'
	if (val === '1') return 'schedule_based'
	throw new Error('invalid exact_times: ' + val)
}

const formatFrequenciesRow = (f) => {
	const startTime = f.start_time
		? formatTime(f.start_time)
		: null
	const endTime = f.end_time
		? formatTime(f.end_time)
		: null

	return [
		f.trip_id || null,
		startTime,
		endTime,
		f.headway_secs ? parseInt(f.headway_secs) : null,
		f.exact_times ? exactTimes(f.exact_times) : null,
	]
}

const afterAll = (opt) => `\
\\.

-- frequencies_row is used to implement arrivals_departures & connections.
UPDATE frequencies
-- This is ugly, but AFAICT there is no cleaner way.
-- see also https://stackoverflow.com/a/4359354/1072129
SET frequencies_row = t.frequencies_row
FROM (
	SELECT
		-- order by all columns so that we don't implicitly depend on the file's order
		(row_number() OVER (PARTITION BY trip_id, start_time ORDER BY end_time, headway_secs, exact_times))::integer AS frequencies_row,
		trip_id, start_time
	FROM frequencies
) AS t
-- self-join
-- frequencies' primary is just (trip_id, start_time)
-- however, the definition for the headway_secs field says:
-- > Multiple headways may be defined for the same trip, but must not overlap. New headways may start at the exact time the previous headway ends.
-- https://gtfs.org/documentation/schedule/reference/#frequenciestxt
-- todo: add \`frequencies.exact_times::text = t.exact_times::text\`? once there is consensus in https://github.com/google/transit/issues/514
WHERE frequencies.trip_id = t.trip_id
AND frequencies.start_time = t.start_time;

CREATE INDEX ON frequencies (trip_id);
CREATE INDEX ON frequencies (exact_times);
`

module.exports = {
	beforeAll,
	formatRow: formatFrequenciesRow,
	afterAll,
}
