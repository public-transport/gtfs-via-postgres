'use strict'

const HEAD = `\
INSERT INTO shapes (
	shape_id,
	shape_pt_loc,
	shape_pt_sequence,
	shape_dist_traveled,
) VALUES `

const formatShapesRow = (sql, s, first = true) => {
	return (first ? HEAD : ', ') + sql `\
(
	${s.shape_id || null},
	${s.shape_pt_loc}, # todo
	${s.shape_pt_sequence ? parseInt(s.shape_pt_sequence) : null},
	${s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null},
)`
}

module.exports = formatShapesRow
