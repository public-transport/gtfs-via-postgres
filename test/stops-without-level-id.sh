#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

GLOBIGNORE="*/levels.txt"
# When omitting levels.txt, --stops-without-level-id/opt.stopsWithoutLevelId should be true by default.
# see also https://github.com/public-transport/gtfs-via-postgres/issues/43
../cli.js -d -- \
	../node_modules/sample-gtfs-feed/gtfs/*.txt 2>/dev/null \
	| grep -c 'stopsWithoutLevelId: true'
unset GLOBIGNORE

echo 'works ✔'
