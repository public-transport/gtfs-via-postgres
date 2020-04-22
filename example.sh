#!/bin/sh

set -e
set -o pipefail

echo 'importing to PostgreSQL'
./cli.js node_modules/sample-gtfs-feed/gtfs/*.txt | psql -b
