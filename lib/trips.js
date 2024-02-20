'use strict'

// https://gtfs.org/schedule/reference/#tripstxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".wheelchair_accessibility AS ENUM (
	'unknown' -- 0 or empty - No accessibility information for the trip.
	, 'accessible' -- 1 – Vehicle being used on this particular trip can accommodate at least one rider in a wheelchair.
	, 'not_accessible' -- 2 – No riders in wheelchairs can be accommodated on this trip.
);
CREATE CAST ("${opt.schema}".wheelchair_accessibility AS text) WITH INOUT AS IMPLICIT;

CREATE TYPE "${opt.schema}".bikes_allowance AS ENUM (
	'unknown' -- 0 or empty - No bike information for the trip.
	, 'allowed' -- 1 – Vehicle being used on this particular trip can accommodate at least one bicycle.
	, 'not_allowed' -- 2 – No bicycles are allowed on this trip.
);
CREATE CAST ("${opt.schema}".bikes_allowance AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".trips (
	trip_id TEXT PRIMARY KEY,
	route_id TEXT NOT NULL,
	FOREIGN KEY (route_id) REFERENCES "${opt.schema}".routes,
	service_id TEXT NOT NULL, -- references "${opt.schema}".service_days.service_id
	trip_headsign TEXT,
	trip_short_name TEXT,
	direction_id INT,
	block_id TEXT,
	shape_id TEXT, -- todo: add NOT NULL?
	${opt.tripsWithoutShapeId ? '' : `CONSTRAINT valid_shape_id CHECK ("${opt.schema}".shape_exists(shape_id)),`}
	-- todo [breaking]: use 0/unknown for empty values
	wheelchair_accessible "${opt.schema}".wheelchair_accessibility,
	-- todo [breaking]: use 0/unknown for empty values
	bikes_allowed "${opt.schema}".bikes_allowance
);

COPY "${opt.schema}".trips (
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

const afterAll = (opt) => `\
\\.

${opt.postgraphile ? `\
CREATE INDEX ON "${opt.schema}".trips (route_id);
COMMENT ON TABLE "${opt.schema}".trips IS E'@foreignKey (shape_id) references shapes_aggregated|@fieldName shape';
` : ''}
`

module.exports = {
	beforeAll,
	formatRow: formatTripsRow,
	afterAll,
}
