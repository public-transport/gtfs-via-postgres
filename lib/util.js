'use strict'

const parseTime = require('gtfs-utils/parse-time')

const formatTime = (gtfsTime) => {
	const {hours, minutes, seconds} = parseTime(gtfsTime)
	return [
		Math.floor(hours / 24),
		`${hours % 24}:${minutes}:${seconds}`,
	]
}

module.exports = {
	formatTime,
}
