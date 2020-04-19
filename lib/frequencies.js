'use strict'

const exactTimes = (val) => {
	if (val === '0') return 'frequency_based'
	if (val === '1') return 'schedule_based'
	throw new Error('invalid exact_times: ' + val)
}

const formatFrequenciesRow = (sql, f) => {
	return sql `\
(
	${f.trip_id || null},
	${f.start_time}, # todo
	${f.end_time}, # todo
	${f.headway_secs ? parseInt(f.headway_secs) : null},
	${f.exact_times ? exactTimes(f.exact_times) : null}
)`
}

formatFrequenciesRow.head = `\
INSERT INTO frequencies (
	trip_id,
	start_time,
	end_time,
	headway_secs,
	exact_times
) VALUES`

module.exports = formatFrequenciesRow
