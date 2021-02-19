# gtfs-via-postgres

**Import GTFS into PostgreSQL** to allow for efficient analysis/processing of large GTFS datasets.

[![npm version](https://img.shields.io/npm/v/gtfs-via-postgres.svg)](https://www.npmjs.com/package/gtfs-via-postgres)
[![build status](https://api.travis-ci.org/derhuerst/gtfs-via-postgres.svg?branch=master)](https://travis-ci.org/derhuerst/gtfs-via-postgres)
[![Prosperity/Apache license](https://img.shields.io/static/v1?label=license&message=Prosperity%2FApache&color=0997E8)](#license)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-postgres.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Installation

```shell
npm install -g gtfs-via-postgres
```

Or use [`npx`](https://npmjs.com/package/npx). ✨


## Usage

```
Usage:
    gtfs-to-sql <gtfs-file> ...
Options:
    --silent                -s  Don't show files being converted.
    --require-dependencies  -d  Require files that the specified GTFS files depend
                                on to be specified as well (e.g. stop_times.txt
                                requires trips.txt). Default: false
    --ignore-unsupported    -u  Ignore unsupported files. Default: false
Examples:
    gtfs-to-sql some-gtfs/*.txt | psql -b # import into PostgreSQL
    gtfs-to-sql -u some-gtfs/*.txt | gzip >gtfs.sql # generate a gzipped SQL dump
```

Some notable limitations mentioned in the [PostgreSQL 13 documentation on date/time types](https://www.postgresql.org/docs/13/datatype-datetime.html):

> For `timestamp with time zone`, the internally stored value is always in UTC (Universal Coordinated Time, traditionally known as Greenwich Mean Time, GMT). An input value that has an explicit time zone specified is converted to UTC using the appropriate offset for that time zone.

> When a `timestamp with time zone` value is output, it is always converted from UTC to the current `timezone` zone, and displayed as local time in that zone. To see the time in another time zone, either change `timezone` or use the `AT TIME ZONE` construct […].

This means that, while you can run queries with date+time values in any timezone (offset) and they will be processed correctly, the output will always be in the database timezone (offset), unless you have explicitly used `AT TIME ZONE`.


## Performance

On my Macbook 13" 2015 (Intel i5-5257U), converting the [457mb `2020-09-04` VBB GTFS feed](https://vbb-gtfs.jannisr.de/2020-09-04/) took ~2:15.


## Related Projects

There are two projects that are very similar to `gtfs-via-postgres`:

[Node-GTFS (`gtfs` npm package)](https://github.com/BlinkTagInc/node-gtfs) is widely used. It covers three use cases: importing GTFS into an [SQLite](https://sqlite.org/) DB, exporting GTFS/GeoJSON from it, and generating HTML or charts for humans. I don't use it though because

- [doesn't handle GTFS Time values correctly](https://github.com/BlinkTagInc/node-gtfs/blob/653b3b747a46ba14e21026507d8e3d63867621e3/lib/utils.js#L31-L41) (checked on 2021-02-18).
- it doesn't always work in a streaming/iterative way ([1](https://github.com/BlinkTagInc/node-gtfs/blob/2eecb2788334fbe3ce9f56b73de1ab714e332bda/lib/export.js#L53)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/2eecb2788334fbe3ce9f56b73de1ab714e332bda/lib/geojson-utils.js#L113-L122), checked on 2021-02-18)
- sometimes does synchronous fs calls ([1](https://github.com/BlinkTagInc/node-gtfs/blob/2eecb2788334fbe3ce9f56b73de1ab714e332bda/lib/import.js#L231-L234), checked on 2021-02-18)

[gtfs-squelize](https://github.com/evansiroky/gtfs-sequelize) uses [sequelize.js](https://sequelize.org) to import a GTFS feed and query the DB. I don't use it because (as of 2021-02-18) it doesn't provide much tooling for analyzing all arrivals/departures.

---

Other related projects:

- [gtfs_SQL_importer](https://github.com/cbick/gtfs_SQL_importer) – Quick & easy import of GTFS data into a SQL database. (Python)
- [gtfsdb](https://github.com/OpenTransitTools/gtfsdb) – Python library for converting GTFS files into a relational database. (Python)
- [gtfspy](https://github.com/CxAalto/gtfspy) – Public transport network analysis using Python and SQLite.
- [GTFS Kit](https://github.com/mrcagney/gtfs_kit) – A Python 3.6+ tool kit for analyzing General Transit Feed Specification (GTFS) data.
- [GtfsToSql](https://github.com/OpenMobilityData/GtfsToSql) – Parses a GTFS feed into an SQL database (Java)
- [gtfs-to-sqlite](https://github.com/aytee17/gtfs-to-sqlite) – A tool for generating an SQLite database from a GTFS feed. (Java)
- [gtfs-schema](https://github.com/tyleragreen/gtfs-schema) – PostgreSQL schemas for GTFS feeds. (plain SQL)
- [markusvalo/HSLtraffic](https://github.com/markusvalo/HSLtraffic) – Scripts to create a PostgreSQL database for HSL GTFS-data. (plain SQL)


## License

This project is dual-licensed: **My contributions are licensed under the [*Prosperity Public License*](https://prosperitylicense.com), [contributions of other people](https://github.com/derhuerst/gtfs-via-postgres/graphs/contributors) are licensed as [Apache 2.0](https://apache.org/licenses/LICENSE-2.0)**.

> This license allows you to use and share this software for noncommercial purposes for free and to try this software for commercial purposes for thirty days.

> Personal use for research, experiment, and testing for the benefit of public knowledge, personal study, private entertainment, hobby projects, amateur pursuits, or religious observance, without any anticipated commercial application, doesn’t count as use for a commercial purpose.

[Buy a commercial license](https://licensezero.com/offers/b93ed685-e6f5-45e6-a120-d99b46f30bf2) or read more about [why I sell private licenses for my projects](https://gist.github.com/derhuerst/0ef31ee82b6300d2cafd03d10dd522f7).


## Contributing

If you have a question or need support using `gtfs-via-postgres`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/gtfs-via-postgres/issues).

By contributing, you agree to release your modifications under the [Apache 2.0 license](LICENSE-APACHE).
