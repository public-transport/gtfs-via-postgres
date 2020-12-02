#!/bin/bash

cd "$(dirname $0)"

set -e
set -o pipefail
set +x

env | grep '^PG'

../cli.js \
	../node_modules/sample-gtfs-feed/gtfs/agency.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar_dates.txt \
	../node_modules/sample-gtfs-feed/gtfs/stops.txt \
	../node_modules/sample-gtfs-feed/gtfs/routes.txt \
	../node_modules/sample-gtfs-feed/gtfs/trips.txt \
	../node_modules/sample-gtfs-feed/gtfs/stop_times.txt \
	| psql -b

query=$(cat << EOF
select extract(epoch from t_arrival) as t_arrival
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

echo ✔︎
