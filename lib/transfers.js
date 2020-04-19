'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatTransfersRow = (t) => {
		return sql `
INSERT INTO transfers (
	from_stop_id,
	to_stop_id,
	transfer_type,
	min_transfer_time,
) VALUES (
	${t.from_stop_id},
	${t.to_stop_id},
	${t.transfer_type},
	${t.min_transfer_time},
)`
	}
	return formatTransfersRow
}

module.exports = create
