FROM node:alpine
LABEL org.opencontainers.image.title="gtfs-via-duckdb"
LABEL org.opencontainers.image.description="Analyze GTFS datasets using DuckDB."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>"
LABEL org.opencontainers.image.documentation="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.source="https://github.com/public-transport/gtfs-via-duckdb"
LABEL org.opencontainers.image.revision="5.0.0"
LABEL org.opencontainers.image.licenses="(Apache-2.0 AND Prosperity-3.0.0)"

WORKDIR /app

# Both moreutils (providing sponge) and postgresql-client (providing psql) are not required but come in handy for users.
RUN apk add --no-cache \
	postgresql-client \
	moreutils

ADD package.json /app
RUN npm install --production && npm cache clean --force

ADD . /app
RUN ln -s /app/cli.js /usr/local/bin/gtfs-via-postgres

VOLUME /gtfs
WORKDIR /gtfs
ENTRYPOINT ["/bin/sh", "-eu", "-o", "pipefail", "-c", "/app/cli.js $@", "--"]
CMD ["/gtfs/*.txt"]
