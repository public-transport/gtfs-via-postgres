'use strict'

// https://developers.google.com/transit/gtfs/reference#shapestxt
const beforeAll = `\
CREATE TABLE shapes (
	id SERIAL PRIMARY KEY,
	shape_id TEXT,
	shape_pt_sequence INT,
	shape_pt_loc geography(POINT),
	shape_dist_traveled REAL
);

CREATE INDEX shapes_by_shape_id ON shapes (shape_id);

COPY shapes (
	shape_id,
	shape_pt_loc,
	shape_pt_sequence,
	shape_dist_traveled
) FROM STDIN csv;
`

const formatShapesRow = (s) => {
	return [
		s.shape_id || null,
		`POINT(${parseFloat(s.shape_pt_lon)} ${parseFloat(s.shape_pt_lat)})`,
		s.shape_pt_sequence ? parseInt(s.shape_pt_sequence) : null,
		s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatShapesRow,
	afterAll,
}
