FROM node:16.8.0-alpine3.13
LABEL org.opencontainers.image.title="gtfs-via-postgres"
LABEL org.opencontainers.image.description="Process GTFS using PostgreSQL."
LABEL org.opencontainers.image.authors="Jannis R <mail@jannisr.de>"
LABEL org.opencontainers.image.documentation="https://github.com/derhuerst/gtfs-via-postgres"
LABEL org.opencontainers.image.source="https://github.com/derhuerst/gtfs-via-postgres"
LABEL org.opencontainers.image.revision="5"
LABEL org.opencontainers.image.licenses="(Apache-2.0 AND Prosperity-3.0.0)"

WORKDIR /app

ADD package.json /app
RUN npm install --production && npm cache clean --force

ADD . /app
RUN ln -s /app/cli.js /usr/local/bin/gtfs-via-postgres

WORKDIR /gtfs
ENTRYPOINT ["/app/cli.js"]
