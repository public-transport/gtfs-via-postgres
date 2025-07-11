#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname $0)"
set -x

# Refer to https://github.com/public-transport/gtfs-via-postgres/issues/45 for context.

# The "core" bug: A feed without routes.agency_id should be importable.
# However, this only applies if there is exactly one route. If there are >1 routes, every route must have an agency_id.
if ../cli.js -d --trips-without-shape-id -s -- ':memory:' \
	invalid-empty-agency-id/*.txt; then
	echo "import didn't fail" 1>&2
	exit 1
else
	echo 'import failed ✔'
fi

# A related bug: With --routes-without-agency-id, lib/deps.js *does not* specify routes to depend on agency.
# *In some cases*, this causes agency to be processed *after* routes, causing the routes processing to fail.
# see also https://github.com/public-transport/gtfs-via-postgres/issues/45#issuecomment-1632649826
../cli.js -d --routes-without-agency-id --trips-without-shape-id -s -- ':memory:' \
	invalid-empty-agency-id/*.txt
echo 'did not fail even with --routes-without-agency-id ✔'
