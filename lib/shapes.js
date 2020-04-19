'use strict'

const formatShapesRow = (sql, s) => {
	return sql `\
(
	${s.shape_id || null},
	'POINT(${parseFloat(s.shape_pt_lon)} ${parseFloat(s.shape_pt_lat)})',
	${s.shape_pt_sequence ? parseInt(s.shape_pt_sequence) : null},
	${s.shape_dist_traveled ? parseInt(s.shape_dist_traveled) : null}
)`
}

formatShapesRow.head = `\
INSERT INTO shapes (
	shape_id,
	shape_pt_loc,
	shape_pt_sequence,
	shape_dist_traveled
) VALUES`

module.exports = formatShapesRow
