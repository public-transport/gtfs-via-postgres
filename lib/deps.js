'use strict'

const getDependencies = (opt) => {
	const {
		tripsWithoutShapeId,
		routesWithoutAgencyId,
	} = opt
	return {
		transfers: [
			'stops',
		],
		stop_times: [
			'trips',
			'stops',
			'service_days',
		],
		routes: [
			routesWithoutAgencyId ? null : 'agency',
		].filter(file => !!file),
		trips: [
			'routes',
			'service_days',
			tripsWithoutShapeId ? null : 'shapes',
		].filter(file => !!file),
		frequencies: [
			'trips',
		],
	}
}

module.exports = getDependencies
