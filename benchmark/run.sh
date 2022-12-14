#!/bin/bash

set -e
set -o pipefail
cd "$(dirname "$0")"

psql -q -b --csv -f index.sql
