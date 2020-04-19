-- https://developers.google.com/transit/gtfs/reference#shapestxt
CREATE TABLE shapes (
	id SERIAL PRIMARY KEY,
	shape_id TEXT,
	shape_pt_sequence INT,
	shape_pt_loc geography(POINT),
	shape_dist_traveled REAL
);

CREATE INDEX shapes_by_shape_id ON shapes (shape_id);
