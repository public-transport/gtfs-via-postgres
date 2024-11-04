#!/bin/bash

set -Eeu
set -o pipefail
cd "$(dirname "$0")"
set -x

wget --compression auto -r --no-parent --no-directories -R .csv.gz -P ../vbb-2022-07-01.gtfs -N 'https://vbb-gtfs.jannisr.de/2022-07-01/'
ls -lh ../vbb-2022-07-01.gtfs

env | grep '^PG' || true

psql -c 'CREATE DATABASE benchmark_raw'
export PGDATABASE=benchmark_raw

../cli.js -d \
	--stops-location-index --stats-by-route-date=view \
	../vbb-2022-07-01.gtfs/*.csv | sponge | psql -b

./run.sh

# The VBB 2022-07-01 GTFS feed doesn't contain any frequencies rows. In order to benchmark the frequencies implementations, we use `--minimize-stoptimes` to generate an equivalent feed that includes frequencies.
gtfstidy --show-warnings \
	--minimize-stoptimes \
	-o ../vbb-2022-07-01.tidied.gtfs ../vbb-2022-07-01.gtfs
ls -lh ../vbb-2022-07-01.tidied.gtfs

psql -c 'CREATE DATABASE benchmark_tidied'
export PGDATABASE=benchmark_tidied

../cli.js -d \
	--stops-location-index --stats-by-route-date=view \
	../vbb-2022-07-01.tidied.gtfs/*.txt | sponge | psql -b

./run.sh
