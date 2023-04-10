'use strict'

const RUN = require('./run.js')
const GET = require('./get.js')

// https://gtfs.org/schedule/reference/#agencytxt
const importData = async (db, pathToAgency, opt, workingState) => {
	await db[RUN](`\
CREATE TABLE "${opt.schema}".agency (
	agency_id TEXT PRIMARY KEY,
	agency_name TEXT NOT NULL,
	agency_url TEXT NOT NULL,
	agency_timezone TEXT NOT NULL REFERENCES "${opt.schema}".valid_timezones (tz),
	agency_lang TEXT, -- todo: validate?
	agency_phone TEXT,
	agency_fare_url TEXT,
	agency_email TEXT
);

COPY "${opt.schema}".agency FROM "${pathToAgency}" (HEADER);
`)

	workingState.nrOfRowsByName.set(
		'agency',
		(await db[GET](`SELECT count(agency_id) AS count FROM "${opt.schema}".agency`))[0].count,
	)
}

module.exports = importData
