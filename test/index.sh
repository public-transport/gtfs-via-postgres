#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

psql -t -c 'SELECT version()'

./calendar-dates-only.sh
./sample-gtfs-feed.sh
./amtrak-gtfs-2021-10-06.sh
./postgraphile.sh
./routes-without-agency-id.sh
./stops-without-level-id.sh
./invalid-empty-agency-id.sh
./multiple-schemas.sh

echo -e "\n\n✔︎ tests passing"
