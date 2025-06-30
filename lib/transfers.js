'use strict'

// https://gtfs.org/documentation/schedule/reference/#transferstxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".transfer_type_v AS ENUM (
	'recommended' -- 0 or empty - Recommended transfer point between routes.
	, 'timed' -- 1 - Timed transfer point between two routes. The departing vehicle is expected to wait for the arriving one and leave sufficient time for a rider to transfer between routes.
	, 'minimum_time' -- 2 – Transfer requires a minimum amount of time between arrival and departure to ensure a connection. The time required to transfer is specified by min_transfer_time.
	, 'impossible' -- 3 - Transfers are not possible between routes at the location.
	, 'in_seat' -- 4 - Passengers can transfer from one trip to another by staying onboard the same vehicle (an "in-seat transfer").
	, 're_board' -- 5 - In-seat transfers are not allowed between sequential trips. The passenger must alight from the vehicle and re-board.
);
CREATE CAST ("${opt.schema}".transfer_type_v AS text) WITH INOUT AS IMPLICIT;

CREATE TABLE "${opt.schema}".transfers (
	id SERIAL PRIMARY KEY,
	from_stop_id TEXT,
	FOREIGN KEY (from_stop_id) REFERENCES "${opt.schema}".stops,
	to_stop_id TEXT,
	FOREIGN KEY (to_stop_id) REFERENCES "${opt.schema}".stops,
	transfer_type "${opt.schema}".transfer_type_v,
	min_transfer_time INT,
	from_route_id TEXT,
	FOREIGN KEY (from_route_id) REFERENCES "${opt.schema}".routes,
	to_route_id TEXT,
	FOREIGN KEY (from_route_id) REFERENCES "${opt.schema}".routes,
	from_trip_id TEXT,
	FOREIGN KEY (from_trip_id) REFERENCES "${opt.schema}".trips,
	to_trip_id TEXT,
	FOREIGN KEY (from_trip_id) REFERENCES "${opt.schema}".trips
);

ALTER TABLE "${opt.schema}".transfers
ADD CONSTRAINT transfers_sig
UNIQUE (
	from_stop_id,
	to_stop_id,
	from_route_id,
	to_route_id,
	from_trip_id,
	to_trip_id
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
	if (val === '4') return 'in_seat'
	if (val === '5') return 're_board'
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

const afterAll = (opt) => `\
\\.

${opt.postgraphile ? `\
CREATE INDEX ON "${opt.schema}".transfers (from_route_id);
CREATE INDEX ON "${opt.schema}".transfers (from_trip_id);
CREATE INDEX ON "${opt.schema}".transfers (to_stop_id);
CREATE INDEX ON "${opt.schema}".transfers (to_route_id);
CREATE INDEX ON "${opt.schema}".transfers (to_trip_id);
` : ''}
`

module.exports = {
	beforeAll,
	formatRow: formatTransfersRow,
	afterAll,
}
