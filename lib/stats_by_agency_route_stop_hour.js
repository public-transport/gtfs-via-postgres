'use strict'

const {fail} = require('assert')
const RUN = require('./run.js')

const createStatsByAgencyIdAndRouteIdAndStopAndHourView = async (db, _, opt) => {
	let materialized = false
	if (opt.statsByAgencyIdAndRouteIdAndStopAndHour === 'materialized-view') {
		// todo: support it once DuckDB supports materialized views
		// see also https://github.com/duckdb/duckdb/discussions/3638
		fail('opt.statsByAgencyIdAndRouteIdAndStopAndHour: materialized-view is currently not supported')
		// materialized = true
	} else if (opt.statsByAgencyIdAndRouteIdAndStopAndHour !== 'view') {
		throw new Error('invalid opt.statsByAgencyIdAndRouteIdAndStopAndHour, must be one of these: none, view, materialized-view.')
	}
	const createViewCmd = materialized
		? `CREATE MATERIALIZED VIEW`
		: `CREATE OR REPLACE VIEW`

	await db[RUN](`\
${createViewCmd} stats_by_agency_route_stop_hour AS
SELECT DISTINCT ON (agency_id, route_id, stop_id, effective_hour)
	agency_id, route_id, stop_id, station_id,
	"date" as service_date,
	date_trunc('hour', t_arrival) AS effective_hour,
	count(*) OVER (PARTITION BY route_id, stop_id, date_trunc('hour', t_arrival)) AS nr_of_arrs
FROM arrivals_departures;
`)

	if (materialized) {
		await db[RUN](`\
CREATE INDEX ON stats_by_agency_route_stop_hour (route_id);
CREATE INDEX ON stats_by_agency_route_stop_hour (stop_id);
CREATE INDEX ON stats_by_agency_route_stop_hour (station_id);
CREATE INDEX ON stats_by_agency_route_stop_hour (effective_hour);
`)
	}
}
createStatsByAgencyIdAndRouteIdAndStopAndHourView.runDespiteMissingSrcFile = true

module.exports = createStatsByAgencyIdAndRouteIdAndStopAndHourView
