'use strict'

const getDependencies = (opt) => {
	return {
		calendar_dates: [
			'calendar',
		],
		transfers: [
			'stops',
		],
		stop_times: [
			'trips',
			'stops',
			'calendar_dates',
		],
		routes: [
			'agency',
		],
		trips: [
			'routes',
			'calendar',
			'shapes',
		],
		frequencies: [
			'trips',
		],
	}
}

module.exports = getDependencies
