#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

unzip -q -j -n amtrak-gtfs-2021-10-06.zip -d amtrak-gtfs-2021-10-06
ls -lh amtrak-gtfs-2021-10-06

psql -c 'create database amtrak_2021_10_06'
export PGDATABASE='amtrak_2021_10_06'

../cli.js -d --trips-without-shape-id --schema amtrak -- amtrak-gtfs-2021-10-06/*.txt | psql -b

query=$(cat << EOF
select extract(epoch from t_arrival)::integer as t_arrival
from amtrak.arrivals_departures
where stop_id = 'BHM' -- Birmingham
and date = '2021-11-26'
order by t_arrival
EOF)

# 2021-11-26T15:15:00-06:00
arr1=$(psql --csv -t -c "$query" | head -n 1)
if [[ "$arr1" != "1637961300" ]]; then
	echo "invalid 1st t_arrival: $arr1" 1>&2
	exit 1
fi

# 2021-11-27T13:45:00-06:00
arrN=$(psql --csv -t -c "$query" | tail -n 1)
if [[ "$arrN" != "1638042300" ]]; then
	echo "invalid 2nd t_arrival: $arrN" 1>&2
	exit 1
fi
