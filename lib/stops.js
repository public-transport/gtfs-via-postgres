'use strict'

const formatStopsRow = (sql, s) => {
	return sql `\
(
	${s.stop_id || null},
	${s.stop_code || null},
	${s.stop_name || null},
	${s.stop_desc || null},
	${s.stop_loc}, # todo
	${s.zone_id || null},
	${s.stop_url || null},
	${s.location_type ? parseInt(s.location_type) : null},
	${s.parent_station || null},
	${s.stop_timezone || null},
	${s.wheelchair_boarding ? parseInt(s.wheelchair_boarding) : null},
	${s.level_id || null},
	${s.platform_code || null}
)`
}

formatStopsRow.head = `\
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
	platform_code
) VALUES`

module.exports = formatStopsRow
