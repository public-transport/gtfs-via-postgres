'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatShapesRow = (s) => {
		return sql `
INSERT INTO shapes (
	shape_id,
	shape_pt_loc,
	shape_pt_sequence,
	shape_dist_traveled,
) VALUES (
	${s.shape_id},
	${s.shape_pt_loc},
	${s.shape_pt_sequence},
	${s.shape_dist_traveled},
)`
	}
	return formatShapesRow
}

module.exports = create
