'use strict'

const locationType = (val) => {
	if (val === '0') return 'stop'
	if (val === '1') return 'station'
	if (val === '2') return 'entrance_exit'
	if (val === '3') return 'node'
	if (val === '4') return 'boarding_area'
	throw new Error('invalid/unsupported location_type: ' + val)
}

const wheelchairBoarding = (val) => {
	if (val === '0') return 'no_info_or_inherit'
	if (val === '1') return 'accessible'
	if (val === '2') return 'not_accessible'
	throw new Error('invalid/unsupported wheelchair_boarding: ' + val)
}

const formatStopsRow = (sql, s) => {
	return sql `\
(
	${s.stop_id || null},
	${s.stop_code || null},
	${s.stop_name || null},
	${s.stop_desc || null},
	${s.stop_loc}, -- todo
	${s.zone_id || null},
	${s.stop_url || null},
	${s.location_type ? locationType(s.location_type) : null},
	${s.parent_station || null},
	${s.stop_timezone || null},
	${s.wheelchair_boarding
		? wheelchairBoarding(s.wheelchair_boarding)
		: null
	},
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

formatStopsRow.afterAll = `
ALTER TABLE stops
ADD CONSTRAINT stops_parent_station_fkey
FOREIGN KEY (parent_station) REFERENCES stops;
`

module.exports = formatStopsRow
