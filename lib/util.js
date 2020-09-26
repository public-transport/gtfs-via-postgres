'use strict'

const parseTime = require('gtfs-utils/parse-time')

const formatTime = (gtfsTime) => {
	const {hours: h, minutes: m, seconds: s} = parseTime(gtfsTime)
	return `${h} hours ${m} minutes ${s === null ? 0 : s} seconds`
}

module.exports = {
	formatTime,
}
