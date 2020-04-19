'use strict'

const HEAD = `\
INSERT INTO frequencies (
	trip_id,
	start_time,
	end_time,
	headway_secs,
	exact_times,
) VALUES `

const formatFrequenciesRow = (sql, f, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${f.trip_id || null},
	${f.start_time}, # todo
	${f.end_time}, # todo
	${f.headway_secs ? parseInt(f.headway_secs) : null},
	${f.exact_times ? parseInt(f.exact_times) : null},
)`
}

module.exports = formatFrequenciesRow
