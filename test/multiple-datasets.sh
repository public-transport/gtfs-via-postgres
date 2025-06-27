#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

unzip -q -j -n amtrak-gtfs-2021-10-06.zip -d amtrak-gtfs-2021-10-06
ls -lh amtrak-gtfs-2021-10-06

db_dir="$(mktemp -d -t gtfs.XXX)"
path_to_db1="$db_dir/multiple-schemas-1.duckdb"
path_to_db2="$db_dir/multiple-schemas-2.duckdb"

shopt -s extglob

../cli.js -d --trips-without-shape-id \
	"$path_to_db1" \
	-- amtrak-gtfs-2021-10-06/!(transfers).txt

../cli.js -d --trips-without-shape-id \
	"$path_to_db2" \
	-- amtrak-gtfs-2021-10-06/*.txt

shopt -u extglob

query_prefix=$(cat << EOF
ATTACH DATABASE '$path_to_db1' AS one (READ_ONLY);
ATTACH DATABASE '$path_to_db2' AS two (READ_ONLY);
SET search_path = 'one,two';
EOF
)

tables_query=$(cat << EOF
$query_prefix
SELECT
	(table_catalog || '.' || table_name) AS table_name
FROM information_schema.tables
WHERE table_schema = 'main'
AND table_catalog = ANY(['one', 'two'])
ORDER BY table_catalog, table_name;
EOF
)
tables_rows=$(duckdb -csv -noheader -c "$tables_query")
# note that one.transfers is missing
tables_expected=$(cat << EOF
one.agency
one.arrivals_departures
one.calendar
one.calendar_dates
one.connections
one.feed_info
one.frequencies
one.largest_arr_dep_time
one.routes
one.service_days
one.stop_times
one.stops
one.trips
one.valid_lang_codes
one.valid_timezones
two.agency
two.arrivals_departures
two.calendar
two.calendar_dates
two.connections
two.feed_info
two.frequencies
two.largest_arr_dep_time
two.routes
two.service_days
two.stop_times
two.stops
two.transfers
two.trips
two.valid_lang_codes
two.valid_timezones
EOF
)
if [[ "$tables_rows" != "$tables_expected" ]]; then
	echo "unexpected list of tables" 1>&2
	exit 1
fi

# https://dba.stackexchange.com/a/72656
nr_of_unequal_stops=$(cat << EOF
$query_prefix
SELECT count(*)
FROM one.stops a
FULL OUTER JOIN two.stops b ON (
    a.stop_id = b.stop_id
)
WHERE (
	a.stop_code IS DISTINCT FROM b.stop_code
	OR a.stop_name IS DISTINCT FROM b.stop_name
	OR a.stop_desc IS DISTINCT FROM b.stop_desc
	OR a.stop_loc IS DISTINCT FROM b.stop_loc
	OR a.zone_id IS DISTINCT FROM b.zone_id
	OR a.stop_url IS DISTINCT FROM b.stop_url
	OR a.location_type::TEXT IS DISTINCT FROM b.location_type::TEXT
	OR a.parent_station IS DISTINCT FROM b.parent_station
	OR a.stop_timezone IS DISTINCT FROM b.stop_timezone
	OR a.wheelchair_boarding::TEXT IS DISTINCT FROM b.wheelchair_boarding::TEXT
	OR a.level_id IS DISTINCT FROM b.level_id
	OR a.platform_code IS DISTINCT FROM b.platform_code
)
EOF
)

unequal_stops_1=$(duckdb -csv -noheader -c "$nr_of_unequal_stops" | head -n 1)
if [[ "$unequal_stops_1" -ne 0 ]]; then
	1>&2 echo "$unequal_stops_1 unequal stops between one.stops & two.stops"
	exit 1
fi

# # put an incompatible version
# duckdb -c "$(cat << EOF
# CREATE OR REPLACE FUNCTION public.gtfs_via_duckdb_import_version()
# RETURNS TEXT
# AS \$\$
# 	SELECT '0.1.2'
# \$\$
# LANGUAGE SQL
# EOF
# )"

# # expect another import to fail
# if ../cli.js -d --trips-without-shape-id \
# 	"$path_to_db" \
# 	-- amtrak-gtfs-2021-10-06/*.txt; then
# 	1>&2 echo "re-import with incompatible version didn't fail"
# 	exit 1
# fi

echo 'works ✔'
