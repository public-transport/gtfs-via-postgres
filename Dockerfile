# > My understanding is that DuckDB Labs plans to release official musl binaries eventually, but it's unclear when that will happen.
# > If you'd like to communicate to DuckDB Labs your desire for this, there's a discussion here: duckdb/duckdb#12523
# https://github.com/duckdb/duckdb-node-neo/issues/131#issuecomment-3476895973
# todo: switch to Alpine once it is fully supported and fast enough

# We use `sh -o pipefail` below, so we need Debian Trixie or later.
# see also https://salsa.debian.org/debian/dash/-/commit/9e21bdb8408bab6613aaf0e7f3ac811224b40943
FROM node:trixie-slim

LABEL org.opencontainers.image.title="gtfs-via-duckdb"
LABEL org.opencontainers.image.description="Analyze GTFS datasets using DuckDB."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>"
LABEL org.opencontainers.image.documentation="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.source="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.revision="5.0.0-alpha.5"
LABEL org.opencontainers.image.licenses="(Apache-2.0 AND Prosperity-3.0.0)"

WORKDIR /app

ADD package.json /app
RUN npm install --production && npm cache clean --force

ADD . /app
RUN ln -s /app/cli.js /usr/local/bin/gtfs-via-duckdb

VOLUME /gtfs
WORKDIR /gtfs
ENTRYPOINT ["/bin/sh", "-eu", "-o", "pipefail", "-c", "/app/cli.js $@", "--"]
CMD ["/gtfs/*.txt"]
