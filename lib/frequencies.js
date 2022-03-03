'use strict'

const {formatTime} = require('./util')

// https://developers.google.com/transit/gtfs/reference#frequenciestxt
const beforeAll = `\
CREATE TYPE exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);

CREATE TABLE frequencies (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	start_time interval NOT NULL,
	end_time interval NOT NULL,
	headway_secs INT NOT NULL,
	exact_times exact_times_v
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

const afterAll = `\
\\.

CREATE INDEX ON frequencies (trip_id);
CREATE INDEX ON frequencies (exact_times);
`

module.exports = {
	beforeAll,
	formatRow: formatFrequenciesRow,
	afterAll,
}
