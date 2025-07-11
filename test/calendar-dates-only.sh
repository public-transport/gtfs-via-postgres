#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

path_to_db="$(mktemp -d)/calendar-dates-only.duckdb"

../cli.js -d --trips-without-shape-id -- \
	"$path_to_db" \
	calendar-dates-only/*.txt

query=$(cat << EOF
select extract(epoch from t_arrival)::integer as t_arrival
from arrivals_departures
where stop_id = 'museum'
order by t_arrival
EOF
)

# 2019-07-15T15:30:00+02:00
arr1=$(duckdb -csv -noheader -c "$query" "$path_to_db" | head -n 1)
if [[ "$arr1" != "1563197400" ]]; then
	echo "invalid 1st t_arrival: $arr1" 1>&2
	exit 1
fi

# 2019-07-20T15:30:00+02:00
arrN=$(duckdb -csv -noheader -c "$query" "$path_to_db" | tail -n 1)
if [[ "$arrN" != "1563629400" ]]; then
	echo "invalid 2nd t_arrival: $arrN" 1>&2
	exit 1
fi

agency_id_null=$(cat << EOF
select count(*)
from arrivals_departures
where agency_id IS NULL
EOF
)
agency_id_null_count="$(duckdb -csv -noheader -c "$agency_id_null" "$path_to_db")"
if [[ "$agency_id_null_count" != "0" ]]; then
	echo ">0 rows with agency_id = null" 1>&2
	exit 1
fi

wheelchair_boarding_query=$(cat << EOF
SELECT DISTINCT ON (stop_id)
	stop_id,
	wheelchair_boarding
FROM arrivals_departures
ORDER BY stop_id, trip_id
EOF
)
wheelchair_boarding_rows="$(duckdb -csv -noheader -c "$wheelchair_boarding_query" "$path_to_db")"
wheelchair_boarding_expected="$(echo -e "airport,accessible\nairport-1,not_accessible\nlake,no_info_or_inherit\nmuseum,no_info_or_inherit")"
if [[ "$wheelchair_boarding_rows" != "$wheelchair_boarding_expected" ]]; then
	echo "invalid wheelchair_boarding values" 1>&2
	exit 1
fi

echo 'works ✔'
