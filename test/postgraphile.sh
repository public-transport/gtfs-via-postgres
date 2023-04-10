#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

env | grep '^PG' || true

psql -c 'create database postgraphile'
export PGDATABASE='postgraphile'

../cli.js -d --trips-without-shape-id --postgraphile -- \
	../node_modules/sample-gtfs-feed/gtfs/*.txt \
	| sponge | psql -b

# kill child processes on exit
# https://stackoverflow.com/questions/360201/how-do-i-kill-background-processes-jobs-when-my-shell-script-exits/2173421#2173421
trap 'exit_code=$?; kill -- $(jobs -p); exit $exit_code' SIGINT SIGTERM EXIT

../scripts/run-postgraphile.js &
sleep 2

expected="$(cat sample-gtfs-feed-postgraphile-test.res.json)"
body=$(node -e 'process.stdout.write(JSON.stringify({query: fs.readFileSync("sample-gtfs-feed-postgraphile-test.graphql", {encoding: "utf8"})}))')
actual_path="$(mktemp -t sample-gtfs-feed-postgraphile-test-XXX)"
curl -X POST 'http://localhost:3000/graphql' -H 'Content-Type: application/json' -H 'Accept: application/json' --data "$body" -sf | jq -r --tab . >"$actual_path"

git diff --exit-code sample-gtfs-feed-postgraphile-test.res.json "$actual_path"

# echo 'works ✔'
