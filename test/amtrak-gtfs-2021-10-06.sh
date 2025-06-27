#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

unzip -q -j -n amtrak-gtfs-2021-10-06.zip -d amtrak-gtfs-2021-10-06
ls -lh amtrak-gtfs-2021-10-06

path_to_db="$(mktemp -d -t gtfs.XXX)/amtrak-gtfs-2021-10-06.duckdb"

../cli.js -d --trips-without-shape-id \
	--import-metadata \
	--stats-by-route-date=view \
	--stats-by-agency-route-stop-hour=view \
	--stats-active-trips-by-hour=view \
	"$path_to_db" \
	-- amtrak-gtfs-2021-10-06/*.txt

query=$(cat << EOF
select extract(epoch from t_arrival)::integer as t_arrival
from arrivals_departures
where stop_id = 'BHM' -- Birmingham
and date = '2021-11-26'
order by t_arrival
EOF
)

# 2021-11-26T15:15:00-05:00
arr1=$(duckdb -csv -noheader -c "$query" "$path_to_db" | head -n 1)
if [[ "$arr1" != "1637957700" ]]; then
	echo "invalid 1st t_arrival: $arr1" 1>&2
	exit 1
fi

# 2021-11-27T13:45:00-05:00
arrN=$(duckdb -csv -noheader -c "$query" "$path_to_db" | tail -n 1)
if [[ "$arrN" != "1638038700" ]]; then
	echo "invalid 2nd t_arrival: $arrN" 1>&2
	exit 1
fi

fMin=$(duckdb -csv -noheader -c "SELECT dates_filter_min('2021-11-27T13:45:00-06')" "$path_to_db" | tail -n 1)
if [[ "$fMin" != "2021-11-24" ]]; then
	echo "invalid dates_filter_min(…): $fMin" 1>&2
	exit 1
fi

acelaStatQuery=$(cat << EOF
SELECT nr_of_trips, nr_of_arrs_deps
FROM stats_by_route_date
WHERE route_id = '40751' -- Acela
AND date = '2021-11-26'
AND is_effective = True
EOF
)
acelaStat=$(duckdb -csv -noheader -c "$acelaStatQuery" "$path_to_db" | tail -n 1)
if [[ "$acelaStat" != "16,190" ]]; then
	echo "invalid stats for route 40751 (Acela) on 2021-11-26: $acelaStat" 1>&2
	exit 1
fi

acelaPhillyStatQuery=$(cat << EOF
SELECT nr_of_arrs
FROM stats_by_agency_route_stop_hour
WHERE route_id = '40751' -- Acela
AND stop_id = 'PHL' -- Philadelphia
AND effective_hour = '2022-07-24 09:00:00-05:00'
EOF
)
acelaPhillyStat=$(duckdb -csv -noheader -c "$acelaPhillyStatQuery" "$path_to_db" | tail -n 1)
if [[ "$acelaPhillyStat" != "2" ]]; then
	echo "invalid stats for route 40751 (Acela) at PHL (Philadelphia) on 2021-11-26: $acelaPhillyStat" 1>&2
	exit 1
fi

nrOfActiveTripsQuery=$(cat << EOF
SELECT nr_of_active_trips
FROM stats_active_trips_by_hour
WHERE "hour" = '2021-11-26 04:00:00-05:00'
EOF
)
# Note: I'm not sure if 127 is correct, but it is in the right ballpark. 🙈
# The following query yields 150 connections, and it doesn't contain those who depart earlier and arrive later.
# SELECT DISTINCT ON (trip_id) *
# FROM amtrak.connections
# WHERE t_departure >= '2021-11-26 02:00:00-05:00'
# AND t_arrival <= '2021-11-26 06:00:00-05:00'
nrOfActiveTrips=$(duckdb -csv -noheader -c "$nrOfActiveTripsQuery" "$path_to_db" | tail -n 1)
if [[ "$nrOfActiveTrips" != "127" ]]; then
	echo "unexpected no. of active trips at 2021-11-26T04:00-05: $nrOfActiveTrips" 1>&2
	exit 1
fi

echo 'works ✔'
