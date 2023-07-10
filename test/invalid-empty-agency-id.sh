#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

if ../cli.js -d --trips-without-shape-id -s -- \
	invalid-empty-agency-id/*.txt >/dev/null; then
	echo "import didn't fail" 1>&2
	exit 1
else
	echo 'import failed ✔'
fi
