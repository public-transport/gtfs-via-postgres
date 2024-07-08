#!/bin/bash

set -e
set -o pipefail
cd "$(dirname "$0")"
set -x

psql -c 'VACUUM ANALYZE'

psql -q -b -v 'ON_ERROR_STOP=1' --csv -f index.sql
