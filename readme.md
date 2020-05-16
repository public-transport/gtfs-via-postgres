# gtfs-via-postgres

Yet another tool to **process GTFS using PostgreSQL.**

[![npm version](https://img.shields.io/npm/v/gtfs-via-postgres.svg)](https://www.npmjs.com/package/gtfs-via-postgres)
[![build status](https://api.travis-ci.org/derhuerst/gtfs-via-postgres.svg?branch=master)](https://travis-ci.org/derhuerst/gtfs-via-postgres)
[![Prosperity/Apache license](https://img.shields.io/static/v1?label=license&message=Prosperity%2FApache&color=0997E8)](#license)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-postgres.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)


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


## License

This project is dual-licensed: **My contributions are licensed under the [*Prosperity Public License*](https://prosperitylicense.com), [contributions of other people](https://github.com/derhuerst/gtfs-via-postgres/graphs/contributors) are licensed as [Apache 2.0](https://apache.org/licenses/LICENSE-2.0)**.

> This license allows you to use and share this software for noncommercial purposes for free and to try this software for commercial purposes for thirty days.

> Personal use for research, experiment, and testing for the benefit of public knowledge, personal study, private entertainment, hobby projects, amateur pursuits, or religious observance, without any anticipated commercial application, doesn’t count as use for a commercial purpose.

[Buy a commercial license](https://licensezero.com/offers/b93ed685-e6f5-45e6-a120-d99b46f30bf2) or read more about [why I sell private licenses for my projects](https://gist.github.com/derhuerst/0ef31ee82b6300d2cafd03d10dd522f7).


## Contributing

If you have a question or need support using `gtfs-via-postgres`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/gtfs-via-postgres/issues).

By contributing, you agree to release your modifications under the [Apache 2.0 license](LICENSE-APACHE).
