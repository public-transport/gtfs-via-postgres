'use strict'

const getDependencies = (opt) => {
	const {
		tripsWithoutShapeId,
		routesWithoutAgencyId,
	} = opt
	return {
		agency: [
			'is_timezone',
		],
		stops: [
			'is_timezone',
		],
		transfers: [
			'stops',
		],
		stop_times: [
			'trips',
			'stops',
			'service_days',
		],
		routes: [
			...(routesWithoutAgencyId ? [] : ['agency']),
		],
		trips: [
			'routes',
			'service_days',
			...(tripsWithoutShapeId ? [] : ['shapes']),
		],
		frequencies: [
			'trips',
		],
	}
}

module.exports = getDependencies
