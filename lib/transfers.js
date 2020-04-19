'use strict'

const transferType = (val) => {
	if (val === '0') return 'recommended'
	if (val === '1') return 'timed'
	if (val === '2') return 'minimum_time'
	if (val === '3') return 'impossible'
	throw new Error('invalid/unsupported transfer_type: ' + val)
}

const formatTransfersRow = (sql, t) => {
	return sql `\
(
	${t.from_stop_id || null},
	${t.to_stop_id || null},
	${t.transfer_type ? transferType(t.transfer_type) : null},
	${t.min_transfer_time ? parseInt(t.min_transfer_time) : null},
	${t.from_route_id},
	${t.to_route_id},
	${t.from_trip_id},
	${t.to_trip_id}
)`
}

formatTransfersRow.head = `\
INSERT INTO transfers (
	from_stop_id,
	to_stop_id,
	transfer_type,
	min_transfer_time,
	from_route_id,
	to_route_id,
	from_trip_id,
	to_trip_id
) VALUES`

module.exports = formatTransfersRow
