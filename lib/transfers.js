'use strict'

const HEAD = `\
INSERT INTO transfers (
	from_stop_id,
	to_stop_id,
	transfer_type,
	min_transfer_time,
) VALUES `

const formatTransfersRow = (sql, t, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${t.from_stop_id || null},
	${t.to_stop_id || null},
	${t.transfer_type ? parseInt(t.transfer_type) : null},
	${t.min_transfer_time ? parseInt(t.min_transfer_time) : null},
)`
}

module.exports = formatTransfersRow
