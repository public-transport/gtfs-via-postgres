'use strict'

const getDependencies = (opt) => {
	const {
		tripsWithoutShapeId,
		routesWithoutAgencyId,
		stopsWithoutLevelId,
	} = opt
	return {
		shape_exists: [
			'shapes',
		],
		agency: [
			'is_timezone',
		],
		stops: [
			'is_timezone',
			...(stopsWithoutLevelId ? [] : ['levels']),
		],
		transfers: [
			'stops',
		],
		stop_times: [
			'trips',
			'stops',
			'service_days',
			'frequencies',
		],
		routes: [
			...(routesWithoutAgencyId ? [] : ['agency']),
		],
		trips: [
			'routes',
			'service_days',
			...(tripsWithoutShapeId ? [] : ['shapes', 'shape_exists']),
		],
		frequencies: [
			'trips',
		],
		pathways: [
			'stops',
		],
	}
}

module.exports = getDependencies
