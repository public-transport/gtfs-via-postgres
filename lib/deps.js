'use strict'

const getDependencies = (opt) => {
	const {
		tripsWithoutShapeId,
		routesWithoutAgencyId,
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
			routesWithoutAgencyId ? null : 'agency',
		].filter(file => !!file),
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
