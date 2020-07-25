'use strict'

const parseTime = require('gtfs-utils/parse-time')

const formatTime = (sql, gtfsTime) => {
	const {hours: h, minutes: m, seconds: s} = parseTime(gtfsTime)
	return sql `make_interval(
		hours => ${h},
		mins => ${m},
		secs => ${s === null ? 0 : s}
	)`
}

module.exports = {
	formatTime,
}
