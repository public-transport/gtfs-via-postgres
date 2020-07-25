#!/bin/bash

cd "$(dirname $0)"

set -e
set -o pipefail
set +x

../cli.js \
	../node_modules/sample-gtfs-feed/gtfs/agency.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar.txt \
	../node_modules/sample-gtfs-feed/gtfs/calendar_dates.txt \
	../node_modules/sample-gtfs-feed/gtfs/stops.txt \
	../node_modules/sample-gtfs-feed/gtfs/routes.txt \
	../node_modules/sample-gtfs-feed/gtfs/trips.txt \
	../node_modules/sample-gtfs-feed/gtfs/stop_times.txt \
	| psql -b

arr=$(psql --csv -c 'select t_arrival from arrivals_departures order by t_arrival limit 1' | tail -n 1)
if [[ "$arr" != "2019-03-01 14:23:00+01" ]]; then
	echo "invalid t_arrival: $arr" 1>&2
	exit 1
fi
