'use strict'

const {formatTime} = require('./util')

// https://developers.google.com/transit/gtfs/reference#frequenciestxt
const beforeAll = `\
CREATE TYPE exact_times_v AS ENUM (
	'frequency_based' -- 0 or empty - Frequency-based trips.
	, 'schedule_based' -- 1 – Schedule-based trips with the exact same headway throughout the day. In this case the end_time value must be greater than the last desired trip start_time but less than the last desired trip start_time + headway_secs.
);

CREATE TYPE frequencies_time AS (
    days_offset SMALLINT,
    "time" TIME
);

CREATE TABLE frequencies (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	start_time frequencies_time NOT NULL,
	end_time frequencies_time NOT NULL,
	headway_secs INT NOT NULL,
	exact_times exact_times_v
);
`

const exactTimes = (val) => {
	if (val === '0') return 'frequency_based'
	if (val === '1') return 'schedule_based'
	throw new Error('invalid exact_times: ' + val)
}

const formatFrequenciesRow = (sql, f) => {
	let startDaysOffset = null, startTime = null
	if (s.start_time) {
		[startDaysOffset, startTime] = formatTime(s.start_time)
	}
	let endDaysOffset = null, endTime = null
	if (s.end_time) {
		[endDaysOffset, endTime] = formatTime(s.end_time)
	}

	return sql `\
(
	${f.trip_id || null},
	${startDaysOffset}, ${startTime},
	${endDaysOffset}, ${endTime},
	${f.headway_secs ? parseInt(f.headway_secs) : null},
	${f.exact_times ? exactTimes(f.exact_times) : null}
)`
}

const head = `\
INSERT INTO frequencies (
	trip_id,
	start_time.days_offset, start_time.time,
	end_time.days_offset, end_time.time,
	headway_secs,
	exact_times
) VALUES`

module.exports = {
	beforeAll,
	head,
	formatRow: formatFrequenciesRow,
}
