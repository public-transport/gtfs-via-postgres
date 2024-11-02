'use strict'

const {formatTime} = require('./util')

// https://gtfs.org/schedule/reference/#frequenciestxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);
CREATE CAST ("${opt.schema}".exact_times_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".frequencies (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES "${opt.schema}".trips,
	start_time INTERVAL NOT NULL,
	end_time INTERVAL NOT NULL,
	headway_secs INT NOT NULL,
	exact_times "${opt.schema}".exact_times_v,
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

COPY "${opt.schema}".frequencies (
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

CREATE INDEX ON "${opt.schema}".frequencies (trip_id);
CREATE INDEX ON "${opt.schema}".frequencies (exact_times);
`

module.exports = {
	beforeAll,
	formatRow: formatFrequenciesRow,
	afterAll,
}
