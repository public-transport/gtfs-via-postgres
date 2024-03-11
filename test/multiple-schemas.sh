#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

unzip -q -j -n amtrak-gtfs-2021-10-06.zip -d amtrak-gtfs-2021-10-06
ls -lh amtrak-gtfs-2021-10-06

psql -c 'create database multiple_schemas'
export PGDATABASE='multiple_schemas'

../cli.js -d --trips-without-shape-id \
	--schema one \
	-- amtrak-gtfs-2021-10-06/*.txt \
	| sponge | psql -b

../cli.js -d --trips-without-shape-id \
	--schema two \
	-- amtrak-gtfs-2021-10-06/*.txt \
	| sponge | psql -b

# https://dba.stackexchange.com/a/72656
nr_of_unequal_stops=$(cat << EOF
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
EOF)

unequal_stops_1=$(psql --csv -t -c "$nr_of_unequal_stops" | head -n 1)
if [[ "$unequal_stops_1" -ne 0 ]]; then
	1>&2 echo "$unequal_stops_1 unequal stops between one.stops & two.stops"
	exit 1
fi

# todo: assert that more tables are equal?

# put an incompatible version
psql -c "$(cat << EOF
CREATE OR REPLACE FUNCTION public.gtfs_via_postgres_import_version()
RETURNS TEXT
AS \$\$
	SELECT '0.1.2'
\$\$
LANGUAGE SQL
EOF)"

# expect another import to fail
if ../cli.js -d --trips-without-shape-id \
	--schema three \
	-- amtrak-gtfs-2021-10-06/*.txt \
	| sponge | psql -b; then
	1>&2 echo "re-import with incompatible version didn't fail"
	exit 1
fi

echo 'works ✔'
