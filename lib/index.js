'use strict'

const {readFileSync} = require('fs')
const {join} = require('path')

const readSchema = (name) => {
	return readFileSync(join(__dirname, 'schemas', name), {encoding: 'utf8'})
}

module.exports = {
	format: {
		agency: require('./agency'),
		calendar: require('./calendar'),
		calendar_dates: require('./calendar_dates'),
		feed_info: require('./feed_info'),
		frequencies: require('./frequencies'),
		routes: require('./routes'),
		shapes: require('./shapes'),
		stop_times: require('./stop_times'),
		stops: require('./stops'),
		transfers: require('./transfers'),
		trips: require('./trips'),
	},
	schemas: {
		agency: readSchema('agency.sql'),
		calendar: readSchema('calendar.sql'),
		calendar_dates: readSchema('calendar_dates.sql'),
		feed_info: readSchema('feed_info.sql'),
		frequencies: readSchema('frequencies.sql'),
		routes: readSchema('routes.sql'),
		shapes: readSchema('shapes.sql'),
		stop_times: readSchema('stop_times.sql'),
		stops: readSchema('stops.sql'),
		transfers: readSchema('transfers.sql'),
		trips: readSchema('trips.sql'),
	},
}
