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
			...(routesWithoutAgencyId && !files.includes('agency') ? [] : ['agency']),
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
			// https://gtfs.org/documentation/schedule/reference/#translationstxt
			// todo: respect opt.*!
			// these are soft dependencies, they are not depended upon, they must only be imported first
			// todo: only specify dependencies here if the files are not in use

			// these are required files anyways
			'agency',
			'stops',
			'routes',
			'trips',
			'stop_times',
			// these are optional, so we only depend on them if they are present
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
			...(files.includes('calendar') ? ['calendar'] : []),
			...(files.includes('calendar_dates') ? ['calendar_dates'] : []),
			// todo: support attributions
			// related: https://github.com/hove-io/transit_model/pull/994/files
			// not supported yet: fare_attributes/fare_rules
			// not supported yet: frequencies
			// not supported yet: transfers
		],
	}
}

module.exports = getDependencies
