#!/bin/bash

set -e
set -o pipefail
cd "$(dirname "$0")"
set -x

psql -c 'VACUUM ANALYZE'

psql -q -b --csv -f index.sql
