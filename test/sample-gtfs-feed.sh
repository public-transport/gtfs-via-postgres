#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

psql -c 'create database sample_gtfs_feed'
export PGDATABASE='sample_gtfs_feed'

../cli.js -d --trips-without-shape-id -- \
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
EOF)

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
EOF)
freq_arr_dep1=$(psql --csv -t -c "$arrs_deps_b_downtown_on_working_days" | head -n 1)
if [[ "$freq_arr_dep1" != "1,1552028340,1552028400,1,1" ]]; then
	echo "invalid/missing frequencies-based arrival/departure: $freq_arr_dep1" 1>&2
	exit 1
fi
freq_arr_dep2=$(psql --csv -t -c "$arrs_deps_b_downtown_on_working_days" | head -n 2 | tail -n 1)
if [[ "$freq_arr_dep2" != "1,1552028640,1552028700,1,1" ]]; then
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
EOF)
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
EOF)
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
EOF)
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
EOF)
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
EOF)
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
EOF)
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
EOF)
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
EOF)
wheelchair_accessible_arrs_deps_rows="$(psql --csv -t -c "$wheelchair_accessible_arrs_deps_query")"
wheelchair_accessible_arrs_deps_expected=$(cat << EOF
a-downtown-all-day,
a-outbound-all-day,
b-downtown-on-weekends,accessible
b-downtown-on-working-days,accessible
b-outbound-on-weekends,unknown
b-outbound-on-working-days,unknown
EOF)
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
EOF)
bikes_allowed_arrs_deps_rows="$(psql --csv -t -c "$bikes_allowed_arrs_deps_query")"
bikes_allowed_arrs_deps_expected=$(cat << EOF
a-downtown-all-day,
a-outbound-all-day,
b-downtown-on-weekends,unknown
b-downtown-on-working-days,unknown
b-outbound-on-weekends,allowed
b-outbound-on-working-days,allowed
EOF)
if [[ "$bikes_allowed_arrs_deps_rows" != "$bikes_allowed_arrs_deps_expected" ]]; then
	echo "arrivals_departures: invalid bikes_allowed values" 1>&2
	exit 1
fi

echo 'works ✔'
