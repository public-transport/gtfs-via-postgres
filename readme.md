# gtfs-via-postgres

**Process GTFS using PostgreSQL.**

[![npm version](https://img.shields.io/npm/v/gtfs-via-postgres.svg)](https://www.npmjs.com/package/gtfs-via-postgres)
[![build status](https://api.travis-ci.org/derhuerst/gtfs-via-postgres.svg?branch=master)](https://travis-ci.org/derhuerst/gtfs-via-postgres)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/gtfs-via-postgres.svg)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-postgres.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me on Patreon](https://img.shields.io/badge/support%20me-on%20patreon-fa7664.svg)](https://patreon.com/derhuerst)


## Installation

```shell
npm install -g gtfs-via-postgres
```

Or use [`npx`](https://npmjs.com/package/npx). ✨


## Usage

```shell
Usage:
    gtfs-to-sql <gtfs-file> ...
Options:
    --silent  -s  Don't show files being converted.
Examples:
    gtfs-to-sql some-gtfs/*.txt >gtfs.sql
```


## Performance

On my Macbook 13" 2015 (Intel i5-5257U), converting the [442mb `2020-04-17` VBB GTFS feed](https://vbb-gtfs.jannisr.de/2020-04-17/) took ~2:20.


## Related

- [gtfs_SQL_importer](https://github.com/cbick/gtfs_SQL_importer) – Quick & easy import of GTFS data into a SQL database. (Python)
- [GtfsToSql](https://github.com/OpenMobilityData/GtfsToSql) – Parses a GTFS feed into an SQL database (Java)
- [gtfs-to-sqlite](https://github.com/aytee17/gtfs-to-sqlite) – A tool for generating an SQLite database from a GTFS feed. (Java)
- [markusvalo/HSLtraffic](https://github.com/markusvalo/HSLtraffic) – Scripts to create a PostgreSQL database for HSL GTFS-data. (plain SQL)


## Contributing

If you have a question or need support using `gtfs-via-postgres`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/gtfs-via-postgres/issues).
