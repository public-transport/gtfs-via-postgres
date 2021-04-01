'use strict'

const getDependencies = (opt) => {
	const {
		tripsWithoutShapeId,
	} = opt
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
			tripsWithoutShapeId ? null : 'shapes',
		].filter(file => !!file),
		frequencies: [
			'trips',
		],
	}
}

module.exports = getDependencies
