#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

shopt -s extglob

# Importing should work *without* levels.txt.
# see also https://github.com/public-transport/gtfs-via-postgres/issues/43
../cli.js -d -s -- \
	':memory:' \
	../node_modules/sample-gtfs-feed/gtfs/!(levels).txt

# Importing should work *with* --stops-without-level-id (and without levels.txt).
# see also https://github.com/public-transport/gtfs-via-postgres/issues/43#issuecomment-1632657546
../cli.js -d -s --stops-without-level-id -- \
	':memory:' \
	../node_modules/sample-gtfs-feed/gtfs/!(levels).txt

echo 'works ✔'
