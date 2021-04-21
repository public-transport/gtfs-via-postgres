'use strict'

// https://developers.google.com/transit/gtfs/reference#tripstxt
const beforeAll = (opt) => `\
CREATE TYPE wheelchair_accessibility AS ENUM (
	'unknown' -- 0 or empty - No accessibility information for the trip.
	, 'accessible' -- 1 – Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.
	, 'not_accessible' -- 2 – No riders in wheelchairs can be accommodated on this trip.
);

CREATE TYPE bikes_allowance AS ENUM (
	'unknown' -- 0 or empty - No bike information for the trip.
	, 'allowed' -- 1 – Vehicle being used on this particular trip can accommodate at least one bicycle.
	, 'not_allowed' -- 2 – No bicycles are allowed on this trip.
);

CREATE TABLE trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	FOREIGN KEY (route_id) REFERENCES routes,
	service_id TEXT NOT NULL,
	FOREIGN KEY (service_id) REFERENCES calendar (service_id),
	trip_headsign TEXT,
	trip_short_name TEXT,
	direction_id INT,
	block_id TEXT,
	shape_id TEXT,
	${opt.tripsWithoutShapeId ? '' : `FOREIGN KEY (shape_id) REFERENCES shapes (shape_id),`}
	wheelchair_accessible wheelchair_accessibility,
	bikes_allowed bikes_allowance
);

COPY trips (
	trip_id,
	route_id,
	service_id,
	trip_headsign,
	trip_short_name,
	direction_id,
	block_id,
	shape_id,
	wheelchair_accessible,
	bikes_allowed
) FROM STDIN csv;
`

const wheelchairAccessibility = (val) => {
	if (val === '0') return 'unknown'
	if (val === '1') return 'accessible'
	if (val === '2') return 'not_accessible'
	throw new Error('invalid wheelchair_accessibility: ' + val)
}

const bikesAllowance = (val) => {
	if (val === '0') return 'unknown'
	if (val === '1') return 'allowed'
	if (val === '2') return 'not_allowed'
	throw new Error('invalid bikes_allowance: ' + val)
}

const formatTripsRow = (t) => {
	return [
		t.trip_id || null,
		t.route_id || null,
		t.service_id || null,
		t.trip_headsign || null,
		t.trip_short_name || null,
		t.direction_id ? parseInt(t.direction_id) : null,
		t.block_id || null,
		t.shape_id || null,
		t.wheelchair_accessible
			? wheelchairAccessibility(t.wheelchair_accessible)
			: null,
		t.bikes_allowed ? bikesAllowance(t.bikes_allowed) : null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatTripsRow,
	afterAll,
}
