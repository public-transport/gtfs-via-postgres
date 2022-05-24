'use strict'

// https://developers.google.com/transit/gtfs/reference#transferstxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".transfer_type_v AS ENUM (
	'recommended' -- 0 or empty - Recommended transfer point between routes.
	, 'timed' -- 1 - Timed transfer point between two routes. The departing vehicle is expected to wait for the arriving one and leave sufficient time for a rider to transfer between routes.
	, 'minimum_time' -- 2 – Transfer requires a minimum amount of time between arrival and departure to ensure a connection. The time required to transfer is specified by min_transfer_time.
	, 'impossible' -- 3 - Transfers are not possible between routes at the location.
);

CREATE TABLE "${opt.schema}".transfers (
	id SERIAL PRIMARY KEY,
	from_stop_id TEXT,
	FOREIGN KEY (from_stop_id) REFERENCES "${opt.schema}".stops,
	to_stop_id TEXT,
	FOREIGN KEY (to_stop_id) REFERENCES "${opt.schema}".stops,
	transfer_type "${opt.schema}".transfer_type_v,
	min_transfer_time INT,
	from_route_id TEXT,
	to_route_id TEXT,
	from_trip_id TEXT,
	to_trip_id TEXT,
	UNIQUE (
		from_stop_id,
		to_stop_id,
		from_route_id,
		to_route_id,
		from_trip_id,
		to_trip_id
	)
);

COPY "${opt.schema}".transfers (
	from_stop_id,
	to_stop_id,
	transfer_type,
	min_transfer_time,
	from_route_id,
	to_route_id,
	from_trip_id,
	to_trip_id
) FROM STDIN csv;
`

const transferType = (val) => {
	if (val === '0') return 'recommended'
	if (val === '1') return 'timed'
	if (val === '2') return 'minimum_time'
	if (val === '3') return 'impossible'
	throw new Error('invalid/unsupported transfer_type: ' + val)
}

const formatTransfersRow = (t) => {
	return [
		t.from_stop_id || null,
		t.to_stop_id || null,
		t.transfer_type ? transferType(t.transfer_type) : null,
		t.min_transfer_time ? parseInt(t.min_transfer_time) : null,
		t.from_route_id,
		t.to_route_id,
		t.from_trip_id,
		t.to_trip_id,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatTransfersRow,
	afterAll,
}
