#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

shopt -s extglob

# When omitting levels.txt, --stops-without-level-id/opt.stopsWithoutLevelId should be true by default.
# see also https://github.com/public-transport/gtfs-via-postgres/issues/43
../cli.js -d -s -- \
	../node_modules/sample-gtfs-feed/gtfs/!(levels).txt \
	| grep -c 'stopsWithoutLevelId: true'

# Importing should work *with* --stops-without-level-id (and without levels.txt).
# see also https://github.com/public-transport/gtfs-via-postgres/issues/43#issuecomment-1632657546
../cli.js -d -s --stops-without-level-id -- \
	../node_modules/sample-gtfs-feed/gtfs/!(levels).txt \
	>/dev/null

echo 'works ✔'
