'use strict'

const sql = require('sql-template')

const create = (sql) => {
	const formatStopsRow = (s) => {
		return sql `
INSERT INTO stops (
	stop_id,
	stop_code,
	stop_name,
	stop_desc,
	stop_loc,
	zone_id,
	stop_url,
	location_type,
	parent_station,
	stop_timezone,
	wheelchair_boarding,
	level_id,
	platform_code,
) VALUES (
	${s.stop_id},
	${s.stop_code},
	${s.stop_name},
	${s.stop_desc},
	${s.stop_loc},
	${s.zone_id},
	${s.stop_url},
	${s.location_type},
	${s.parent_station},
	${s.stop_timezone},
	${s.wheelchair_boarding},
	${s.level_id},
	${s.platform_code},
)`
	}
	return formatStopsRow
}

module.exports = create
