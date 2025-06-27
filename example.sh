#!/bin/sh

set -e
set -u
set -o pipefail

2>&1 echo "importing into PostgreSQL:"
./cli.js --ignore-unsupported --require-dependencies --trips-without-shape-id --silent \
	node_modules/sample-gtfs-feed/gtfs/*.txt \
	| sponge | psql -b

2>&1 echo "\nfetching a connection during DST switch:"
psql -c "$(cat <<- EOM
	SELECT
		trip_id, route_id,
		from_stop_id, t_departure,
		from_stop_sequence,
		to_stop_id, t_arrival
	FROM connections
	WHERE trip_id = 'during-dst-1'
	AND t_departure > '2019-03-31T01:55:00+01:00' AND t_departure < '2019-03-31T03:00:00+02:00'
	-- AND route_id = 'D'
	-- AND from_stop_id = 'airport'
EOM)"

2>&1 echo "\nfetching the departure at the same time:"
psql -c "$(cat <<- EOM
	SELECT
		trip_id, route_id,
		stop_id, t_departure,
		stop_sequence
	FROM arrivals_departures
	WHERE trip_id = 'during-dst-1'
	AND t_departure > '2019-03-31T01:55:00+01:00' AND t_departure < '2019-03-31T03:00:00+02:00'
	-- AND route_id = 'D'
	-- AND stop_id = 'airport'
EOM)"
