FROM node:alpine
LABEL org.opencontainers.image.title="gtfs-via-duckdb"
LABEL org.opencontainers.image.description="Analyze GTFS datasets using DuckDB."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>"
LABEL org.opencontainers.image.documentation="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.source="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.revision="5.0.0-alpha.1"
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
