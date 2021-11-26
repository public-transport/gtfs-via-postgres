#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

./sample-gtfs-feed.sh
./amtrak-gtfs-2021-10-06.sh

echo -e "\n\n✔︎ tests passing"
