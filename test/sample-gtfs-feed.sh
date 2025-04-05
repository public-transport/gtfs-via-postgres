#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

psql -c 'create database sample_gtfs_feed'
export PGDATABASE='sample_gtfs_feed'

# --lower-case-lang-codes: Even though sample-gtfs-feed@0.11.2 *does not* contain invalid-case language codes (e.g. de_aT or de-at), we check that with --lower-case-lang-codes valid ones are still accepted.
../cli.js -d --trips-without-shape-id --lower-case-lang-codes -- \
	../node_modules/sample-gtfs-feed/gtfs/agency.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar_dates.txt \
	../node_modules/sample-gtfs-feed/gtfs/frequencies.txt \
	../node_modules/sample-gtfs-feed/gtfs/stops.txt \
	../node_modules/sample-gtfs-feed/gtfs/routes.txt \
	../node_modules/sample-gtfs-feed/gtfs/trips.txt \
	../node_modules/sample-gtfs-feed/gtfs/stop_times.txt \
	../node_modules/sample-gtfs-feed/gtfs/levels.txt \
	../node_modules/sample-gtfs-feed/gtfs/pathways.txt \
	../node_modules/sample-gtfs-feed/gtfs/translations.txt \
	| sponge | psql -b

query=$(cat << EOF
select extract(epoch from t_arrival)::integer as t_arrival
from arrivals_departures
where route_id = 'D'
order by t_arrival
EOF
)

arr1=$(psql --csv -t -c "$query" | head -n 1)
if [[ "$arr1" != "1553993700" ]]; then
	echo "invalid 1st t_arrival: $arr1" 1>&2
	exit 1
fi

arr2=$(psql --csv -t -c "$query" | head -n 2 | tail -n 1)
if [[ "$arr2" != "1553994180" ]]; then
	echo "invalid 2nd t_arrival: $arr2" 1>&2
	exit 1
fi

arrs_deps_b_downtown_on_working_days=$(cat << EOF
	SELECT
		stop_sequence,
		extract(epoch from t_arrival)::integer as arr,
		extract(epoch from t_departure)::integer as dep,
		frequencies_row, frequencies_it
	FROM arrivals_departures
	WHERE trip_id = 'b-downtown-on-working-days'
	ORDER BY t_departure
	LIMIT 2
EOF
)
freq_arr_dep1=$(psql --csv -t -c "$arrs_deps_b_downtown_on_working_days" | head -n 1)
if [[ "$freq_arr_dep1" != "1,1552028340,1552028400,1,1" ]]; then
	echo "invalid/missing frequencies-based arrival/departure: $freq_arr_dep1" 1>&2
	exit 1
fi
freq_arr_dep2=$(psql --csv -t -c "$arrs_deps_b_downtown_on_working_days" | head -n 2 | tail -n 1)
if [[ "$freq_arr_dep2" != "1,1552028640,1552028700,1,2" ]]; then
	echo "invalid/missing frequencies-based arrival/departure: $freq_arr_dep1" 1>&2
	exit 1
fi

cons_b_downtown_on_working_days=$(cat << EOF
	SELECT
		from_stop_sequence,
		extract(epoch from t_departure)::integer as dep,
		to_stop_sequence,
		extract(epoch from t_arrival)::integer as arr
	FROM connections
	WHERE trip_id = 'b-downtown-on-working-days'
	ORDER BY t_departure
	LIMIT 1
EOF
)
freq_con1=$(psql --csv -t -c "$cons_b_downtown_on_working_days")
if [[ "$freq_con1" != "1,1552028400,3,1552028760" ]]; then
	echo "invalid/missing frequencies-based connection: $freq_con1" 1>&2
	exit 1
fi

connection_during_dst=$(cat << EOF
	SELECT
		from_stop_sequence,
		extract(epoch from t_departure)::integer as dep
	FROM connections
	WHERE trip_id = 'during-dst-1'
	AND t_departure = '2019-03-31T01:58+01'
EOF
)
dst1=$(psql --csv -t -c "$connection_during_dst" | head -n 1)
if [[ "$dst1" != "0,1553993880" ]]; then
	echo "invalid/missing DST t_departure: $dst1" 1>&2
	exit 1
fi

airport_levels=$(cat << EOF
	SELECT
		level_id,
		level_index,
		level_name
	FROM levels
	WHERE level_id LIKE 'airport-%'
	ORDER BY level_index
	LIMIT 1
EOF
)
lvl1=$(psql --csv -t -c "$airport_levels" | head -n 1)
if [[ "$lvl1" != "airport-level-0,0,ground level" ]]; then
	echo "invalid/missing lowest airport-% level: $lvl1" 1>&2
	exit 1
fi

airportPathway=$(cat << EOF
	SELECT
		pathway_mode,
		is_bidirectional
	FROM pathways
	WHERE from_stop_id = 'airport-entrance'
	AND to_stop_id = 'airport-1-access'
	LIMIT 1
EOF
)
pw1=$(psql --csv -t -c "$airportPathway" | head -n 1)
if [[ "$pw1" != "escalator,f" ]]; then
	echo "invalid/missing DST t_departure: $pw1" 1>&2
	exit 1
fi

timepoint_exact=$(cat << EOF
	SELECT timepoint
	FROM stop_times
	WHERE timepoint = 'exact'
	AND stop_sequence_consec = 0
	LIMIT 1
EOF
)
exact1=$(psql --csv -t -c "$timepoint_exact" | head -n 1)
if [[ "$exact1" != "exact" ]]; then
	echo "invalid/missing DST t_departure: $exact1" 1>&2
	exit 1
fi

stops_translations=$(cat << EOF
	SELECT translation, language
	FROM translations
	WHERE table_name = 'stops' AND field_name = 'stop_name'
	AND language = 'de-DE'
	AND record_id = 'airport-entrance'
EOF
)
airport_entrance_translation=$(psql --csv -t -c "$stops_translations")
if [[ "$airport_entrance_translation" != "Eingang,de-DE" ]]; then
	echo "invalid/missing stop translation: $airport_entrance_translation" 1>&2
	exit 1
fi

stops_translated=$(cat << EOF
	SELECT
		stop_id,
		stop_name,
		stop_name_lang
	FROM stops_translated
	WHERE (stop_name_lang IS NULL or stop_name_lang = 'de-DE')
	AND stop_id = 'airport-entrance'
EOF
)
translated_airport_entrance=$(psql --csv -t -c "$stops_translated")
if [[ "$translated_airport_entrance" != "airport-entrance,Eingang,de-DE" ]]; then
	echo "invalid/missing translated stop: $translated_airport_entrance" 1>&2
	exit 1
fi

wheelchair_accessible_arrs_deps_query=$(cat << EOF
SELECT DISTINCT ON (trip_id)
	trip_id, wheelchair_accessible
FROM arrivals_departures
WHERE route_id = ANY(ARRAY['A', 'B'])
ORDER BY trip_id
EOF
)
wheelchair_accessible_arrs_deps_rows="$(psql --csv -t -c "$wheelchair_accessible_arrs_deps_query")"
wheelchair_accessible_arrs_deps_expected=$(cat << EOF
a-downtown-all-day,
a-outbound-all-day,
b-downtown-on-weekends,accessible
b-downtown-on-working-days,accessible
b-outbound-on-weekends,unknown
b-outbound-on-working-days,unknown
EOF
)
if [[ "$wheelchair_accessible_arrs_deps_rows" != "$wheelchair_accessible_arrs_deps_expected" ]]; then
	echo "arrivals_departures: invalid wheelchair_accessible values" 1>&2
	exit 1
fi

bikes_allowed_arrs_deps_query=$(cat << EOF
SELECT DISTINCT ON (trip_id)
	trip_id, bikes_allowed
FROM arrivals_departures
WHERE route_id = ANY(ARRAY['A', 'B'])
ORDER BY trip_id
EOF
)
bikes_allowed_arrs_deps_rows="$(psql --csv -t -c "$bikes_allowed_arrs_deps_query")"
bikes_allowed_arrs_deps_expected=$(cat << EOF
a-downtown-all-day,
a-outbound-all-day,
b-downtown-on-weekends,unknown
b-downtown-on-working-days,unknown
b-outbound-on-weekends,allowed
b-outbound-on-working-days,allowed
EOF
)
if [[ "$bikes_allowed_arrs_deps_rows" != "$bikes_allowed_arrs_deps_expected" ]]; then
	echo "arrivals_departures: invalid bikes_allowed values" 1>&2
	exit 1
fi

frequencies_it_query=$(cat << EOF
SELECT t_departure, stop_sequence, stop_id frequencies_it
FROM arrivals_departures
WHERE trip_id = 'b-downtown-on-working-days' AND "date" = '2019-05-29' AND frequencies_it = 3
EOF
)
frequencies_it_rows="$(psql --csv -t -c "$frequencies_it_query")"
frequencies_it_expected=$(cat << EOF
2019-05-29 08:10:00+02,1,airport
2019-05-29 08:18:00+02,3,lake
2019-05-29 08:27:00+02,5,center
EOF
)
if [[ "$frequencies_it_rows" != "$frequencies_it_expected" ]]; then
	echo "arrivals_departures with frequencies_it=3" 1>&2
	exit 1
fi

frequencies_it_connections_query=$(cat << EOF
SELECT from_stop_sequence, t_departure, t_arrival, frequencies_it
FROM connections
WHERE trip_id = 'b-downtown-on-working-days'
AND "date" = '2019-03-08'
AND frequencies_row = 1
ORDER BY t_departure ASC
LIMIT 3
EOF
)
frequencies_it_connections_rows="$(psql --csv -t -c "$frequencies_it_connections_query")"
frequencies_it_connections_expected=$(cat << EOF
1,2019-03-08 08:00:00+01,2019-03-08 08:06:00+01,1
1,2019-03-08 08:05:00+01,2019-03-08 08:11:00+01,2
3,2019-03-08 08:08:00+01,2019-03-08 08:16:00+01,1
EOF
)
if [[ "$frequencies_it_connections_rows" != "$frequencies_it_connections_expected" ]]; then
	echo "first 3 connections by t_departure" 1>&2
	exit 1
fi

stops_translated_query=$(cat << EOF
SELECT
	stop_id,
	stop_name, stop_name_lang,
	stop_desc, stop_desc_lang,
	stop_url, stop_url_lang
FROM stops_translated
WHERE stop_id LIKE 'airport%'
EOF
)
stops_translated_rows="$(psql --csv -t -c "$stops_translated_query")"
stops_translated_expected=$(cat << EOF
airport,International Airport (ABC),,train station at the Internationl Airport (ABC),,https://fta.example.org/stations/airport.html,
airport-1,Gleis 1,de-DE,Platform 1,,,
airport-1-access,,,,,,
airport-2,Platform 2,,Platform 2,,,
airport-2-access,,,,,,
airport-2-boarding,pl. 2 boarding,,platform 2 boarding area,,,
airport-entrance,Eingang,de-DE,,,,
airport-entrance,Entrada,es-ES,,,,
EOF
)
if [[ "$stops_translated_rows" != "$stops_translated_expected" ]]; then
	echo "stops_translated with stop_id=airport*" 1>&2
	exit 1
fi

echo 'works ✔'
