#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

../cli.js -d --routes-without-agency-id -- \
	':memory:' \
	../node_modules/sample-gtfs-feed/gtfs/*.txt

echo 'works ✔'
