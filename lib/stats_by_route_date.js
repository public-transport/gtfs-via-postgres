'use strict'

const afterAll = (opt) => {
	let materialized = false
	if (opt.statsByRouteIdAndDate === 'materialized-view') {
		materialized = true
	} else if (opt.statsByRouteIdAndDate !== 'view') {
		throw new Error('invalid opt.statsByRouteIdAndDate, must be one of these: none, view, materialized-view.')
	}
	const createViewCmd = materialized
		? `CREATE MATERIALIZED VIEW`
		: `CREATE OR REPLACE VIEW`

	return `\
${createViewCmd} "${opt.schema}".stats_by_route_date AS
WITH
	arrs_deps_with_svc_date AS NOT MATERIALIZED (
		SELECT
			route_id, stop_sequence_consec,
			"date"::date AS svc_date,
			EXTRACT(DOW FROM "date") AS svc_dow
		FROM "${opt.schema}".arrivals_departures
	),
	by_svc_date AS NOT MATERIALIZED (
		SELECT DISTINCT ON (route_id, svc_date)
			route_id,
			svc_date AS "date",
			svc_dow AS dow,
			count(*) FILTER (WHERE stop_sequence_consec = 0) OVER (PARTITION BY route_id, svc_date) AS nr_of_trips,
			count(*) OVER (PARTITION BY route_id, svc_date) AS nr_of_arrs_deps
		FROM arrs_deps_with_svc_date
	),
	arrs_deps_with_effective_date AS NOT MATERIALIZED (
		SELECT
			route_id, stop_sequence_consec,
			coalesce(t_departure, t_arrival)::date AS effective_date,
			EXTRACT(DOW FROM coalesce(t_departure, t_arrival)) AS effective_dow
		FROM "${opt.schema}".arrivals_departures
	),
	by_effective_date AS NOT MATERIALIZED (
		SELECT DISTINCT ON (route_id, effective_date)
			route_id,
			effective_date AS "date",
			effective_dow AS dow,
			count(*) FILTER (WHERE stop_sequence_consec = 0) OVER (PARTITION BY route_id, effective_date) AS nr_of_trips,
			count(*) OVER (PARTITION BY route_id, effective_date) AS nr_of_arrs_deps
		FROM arrs_deps_with_effective_date
	)
SELECT
	*,
	True AS is_effective
FROM by_effective_date
UNION
SELECT
	*,
	False AS is_effective
FROM by_svc_date;

${materialized ? `\
CREATE INDEX ON "${opt.schema}".stats_by_route_date (route_id);
CREATE INDEX ON "${opt.schema}".stats_by_route_date ("date");
CREATE INDEX ON "${opt.schema}".stats_by_route_date (route_id, "date", is_effective);
CREATE INDEX ON "${opt.schema}".stats_by_route_date (route_id, dow, is_effective);
` : ''}

${opt.postgraphile ? `\
COMMENT ON${materialized ? ' MATERIALIZED' : ''} VIEW "${opt.schema}".stats_by_route_date IS E'@name routeStats\\n@primaryKey route_id,date,is_effective\\n@foreignKey (route_id) references routes|@fieldName route|@foreignFieldName statsByDate';
` : ''}
`
}

module.exports = {
	afterAll,
}
