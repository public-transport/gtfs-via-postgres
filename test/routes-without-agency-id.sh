#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

../cli.js -d --routes-without-agency-id -- \
	../node_modules/sample-gtfs-feed/gtfs/*.txt \
	>/dev/null

echo 'works ✔'
