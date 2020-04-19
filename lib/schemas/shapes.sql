-- https://developers.google.com/transit/gtfs/reference#shapestxt
CREATE TABLE shapes (
	shape_id TEXT,
	shape_pt_sequence INT,
	PRIMARY KEY (shape_id, shape_pt_sequence),
	shape_pt_loc geography(POINT),
	shape_dist_traveled REAL
);
