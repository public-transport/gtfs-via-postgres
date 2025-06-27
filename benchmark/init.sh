#!/bin/bash

set -e
set -o pipefail
cd "$(dirname "$0")"
set -x

wget --compression auto -r --no-parent --no-directories -R .csv.gz,.csv.br -P ../vbb-2025-05-21.gtfs -N 'https://vbb-gtfs.jannisr.de/2025-05-21/'
ls -lh ../vbb-2025-05-21.gtfs

env | grep '^PG' || true

../cli.js -d \
	--stops-location-index --stats-by-route-date=view \
	vbb-2025-05-21.gtfs.duckdb \
	../vbb-2025-05-21.gtfs/*.csv
