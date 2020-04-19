# https://developers.google.com/transit/gtfs/reference#shapestxt
CREATE TABLE shapes (
	shape_id TEXT PRIMARY KEY,
	shape_pt_loc geography(POINT),
	shape_pt_sequence INT,
	shape_dist_traveled REAL,
)
