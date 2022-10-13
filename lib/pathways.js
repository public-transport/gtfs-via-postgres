'use strict'

const {formatTime} = require('./util')

// https://developers.google.com/transit/gtfs/reference#pathwaystxt
const beforeAll = (opt) => `\
CREATE TYPE "${opt.schema}".pathway_mode_v AS ENUM (
	'walkway' -- 1
	, 'stairs' -- 2
	, 'moving_sidewalk_travelator' -- 3 – moving sidewalk/travelator
	, 'escalator' -- 4
	, 'elevator' -- 5
	, 'fare_gate' -- 6 – (or payment gate): A pathway that crosses into an area of the station where a proof of payment is required (usually via a physical payment gate).
	-- Fare gates may either separate paid areas of the station from unpaid ones, or separate different payment areas within the same station from each other. This information can be used to avoid routing passengers through stations using shortcuts that would require passengers to make unnecessary payments, like directing a passenger to walk through a subway platform to reach a busway.
	, 'exit_gate' -- 7 – Indicates a pathway exiting an area where proof-of-payment is required into an area where proof-of-payment is no longer required.
);

CREATE TABLE "${opt.schema}".pathways (
	pathway_id TEXT PRIMARY KEY,
	from_stop_id TEXT NOT NULL,
	FOREIGN KEY (from_stop_id) REFERENCES "${opt.schema}".stops (stop_id),
	to_stop_id TEXT NOT NULL,
	FOREIGN KEY (to_stop_id) REFERENCES "${opt.schema}".stops (stop_id),
	pathway_mode "${opt.schema}".pathway_mode_v,
	is_bidirectional BOOLEAN NOT NULL,
	length DOUBLE PRECISION, -- todo: add non-negative constraint
	traversal_time INTEGER, -- todo: add positive constraint
	stair_count INTEGER, -- todo: add non-0 constraint
	max_slope DOUBLE PRECISION,
	min_width DOUBLE PRECISION, -- todo: add positive constraint
	signposted_as TEXT,
	reversed_signposted_as TEXT
);

COPY "${opt.schema}".pathways (
	pathway_id,
	from_stop_id,
	to_stop_id,
	pathway_mode,
	is_bidirectional,
	length,
	traversal_time,
	stair_count,
	max_slope,
	min_width,
	signposted_as,
	reversed_signposted_as
) FROM STDIN csv;
`

const pathwayMode = (val) => {
	if (val === '1') return 'walkway'
	if (val === '2') return 'stairs'
	if (val === '3') return 'moving_sidewalk_travelator'
	if (val === '4') return 'escalator'
	if (val === '5') return 'elevator'
	if (val === '6') return 'fare_gate'
	if (val === '7') return 'exit_gate'
	throw new Error('invalid pathway_mode: ' + val)
}

const formatPathwaysRow = (p) => {
	let is_bidirectional
	if (p.is_bidirectional === '0') is_bidirectional = 'false'
	else if (p.is_bidirectional === '1') is_bidirectional = 'true'
	else throw new Error('invalid is_bidirectional: ' + p.is_bidirectional)

	return [
		p.pathway_id,
		p.from_stop_id,
		p.to_stop_id,
		pathwayMode(p.pathway_mode),
		is_bidirectional,
		p.length,
		p.traversal_time,
		p.stair_count,
		p.max_slope,
		p.min_width,
		p.signposted_as || null,
		p.reversed_signposted_as || null,
	]
}

const afterAll = (opt) => `\
\\.

${opt.postgraphile ? `\
CREATE INDEX ON "${opt.schema}".pathways (from_stop_id);
CREATE INDEX ON "${opt.schema}".pathways (to_stop_id);
` : ''}
`

module.exports = {
	beforeAll,
	formatRow: formatPathwaysRow,
	afterAll,
}
