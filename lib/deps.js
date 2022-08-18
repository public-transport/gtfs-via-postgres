'use strict'

const getDependencies = (opt, files) => {
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
		feed_info: [
			'is_bcp_47_code',
		],
		translations: [
			'is_bcp_47_code',
			// > table_name
			// > Defines the dataset table that contains the field to be translated. The following values are allowed:
			// > agency
			// > stops
			// > routes
			// > trips
			// > stop_times
			// > feed_info
			// > pathways
			// > levels
			// > attributions
			// https://developers.google.com/transit/gtfs/reference#translationstxt
			// todo: respect opt.*!
			// these are soft dependencies, they are not depended upon, they must only be imported first
			// todo: only specify dependencies here if the files are not in use
			'agency',
			'stops',
			'routes',
			'trips',
			...(files.includes('stop_times')
				? ['stop_times']
				: []
			),
			...(files.includes('feed_info')
				? ['feed_info']
				: []
			),
			...(files.includes('pathways')
				? ['pathways']
				: []
			),
			...(files.includes('levels')
				? ['levels']
				: []
			),
			// not supported yet: attributions
		],
	}
}

module.exports = getDependencies
