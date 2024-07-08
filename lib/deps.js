'use strict'

const getDependencies = (opt, files) => {
	const {
		tripsWithoutShapeId,
		routesWithoutAgencyId,
		stopsWithoutLevelId,
	} = opt
	return {
		agency: [
			'valid_timezones',
		],
		stops: [
			'valid_timezones',
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
			...(tripsWithoutShapeId ? [] : ['shapes']),
		],
		frequencies: [
			'trips',
		],
		pathways: [
			'stops',
		],
		feed_info: [
			'valid_lang_codes',
		],
		translations: [
			'valid_lang_codes',
			// // > table_name
			// // > Defines the dataset table that contains the field to be translated. The following values are allowed:
			// // > agency
			// // > stops
			// // > routes
			// // > trips
			// // > stop_times
			// // > feed_info
			// // > pathways
			// // > levels
			// // > attributions
			// // https://gtfs.org/schedule/reference/#translationstxt
			// // todo: respect opt.*!
			// // these are soft dependencies, they are not depended upon, they must only be imported first
			// // todo: only specify dependencies here if the files are not in use
			// 'agency',
			// 'stops',
			// 'routes',
			// 'trips',
			// ...(files.includes('stop_times')
			// 	? ['stop_times']
			// 	: []
			// ),
			// ...(files.includes('feed_info')
			// 	? ['feed_info']
			// 	: []
			// ),
			// ...(files.includes('pathways')
			// 	? ['pathways']
			// 	: []
			// ),
			...(files.includes('levels')
				? ['levels']
				: []
			),
			// // not supported yet: attributions
		],
	}
}

module.exports = getDependencies
