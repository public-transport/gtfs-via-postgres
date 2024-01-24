'use strict'

const {formatTime} = require('./util')

// https://gtfs.org/schedule/reference/#levelstxt
const beforeAll = (opt) => `\
CREATE TABLE "${opt.schema}".levels (
	level_id TEXT PRIMARY KEY,
	level_index DOUBLE PRECISION NOT NULL,
	level_name TEXT
);

COPY "${opt.schema}".levels (
	level_id,
	level_index,
	level_name
) FROM STDIN csv;
`

const formatLevelsRow = (l) => {
	return [
		l.level_id,
		parseFloat(l.level_index),
		l.level_name || null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatLevelsRow,
	afterAll,
}
