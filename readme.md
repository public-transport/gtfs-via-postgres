# gtfs-via-postgres

**Import GTFS into PostgreSQL** to allow for efficient analysis/processing of large GTFS datasets.

[![npm version](https://img.shields.io/npm/v/gtfs-via-postgres.svg)](https://www.npmjs.com/package/gtfs-via-postgres)
[![build status](https://api.travis-ci.org/derhuerst/gtfs-via-postgres.svg?branch=master)](https://travis-ci.org/derhuerst/gtfs-via-postgres)
[![binary build status](https://img.shields.io/github/workflow/status/derhuerst/gtfs-via-postgres/publish-binaries/master)](https://github.com/derhuerst/gtfs-via-postgres/actions)
[![Prosperity/Apache license](https://img.shields.io/static/v1?label=license&message=Prosperity%2FApache&color=0997E8)](#license)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-postgres.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)


## Installation

```shell
npm install -g gtfs-via-postgres
```

Or use [`npx`](https://npmjs.com/package/npx). ✨

There are also [prebuilt binaries available](https://github.com/derhuerst/gtfs-via-postgres/releases/latest).


## Getting Started

If you have a `.zip` GTFS feed, unzip it into individual files.

We're going to use the [2021-02-12 *VBB* feed](https://vbb-gtfs.jannisr.de/2021-02-12/) as an example, which consists of individual files already.

```sh
wget -r --no-parent --no-directories -P gtfs -N 'https://vbb-gtfs.jannisr.de/2021-02-12/'
# …
# Downloaded 13 files in 20s.
ls -lh gtfs
# 3.5K agency.csv
#  87K calendar.csv
# 1.0M calendar_dates.csv
#  64B frequencies.csv
# 246B license
# 140B pathways.csv
#  47K routes.csv
# 135M shapes.csv
# 273M stop_times.csv
# 4.5M stops.csv
# 4.0M transfers.csv
#  14M trips.csv
```

Depending on your specific setup, configure access to the PostgreSQL database via [`PG*` environment variables](https://www.postgresql.org/docs/13/libpq-envars.html):

```sh
export PGUSER=postgres
export PGPASSWORD=password
env PGDATABASE=postgres psql -c 'create database vbb_2021_02_12'
export PGDATABASE=vbb_2021_02_12
```

Install `gtfs-via-postgres` and use it to import the GTFS data:

```sh
npm install -D gtfs-via-postgres
npm exec -- gtfs-to-sql --require-dependencies gtfs/*.csv | psql -b
# agency
# calendar
# CREATE EXTENSION
# BEGIN
# CREATE TABLE
# COPY 37
# …
# CREATE INDEX
# CREATE VIEW
# COMMIT
```

Importing will take 10s to 10m, depending on the size of the feed. On my laptop, importing the above feed takes about 4m.

`gtfs-via-postgres` adds these views:

- `service_days` ([materialized](https://www.postgresql.org/docs/13/sql-creatematerializedview.html)) "applies" [`calendar_dates`](https://gtfs.org/reference/static/#calendar_datestxt) to [`calendar`](https://gtfs.org/reference/static/#calendartxt) to give you all days of operation for each "service" defined in [`calendar`](https://gtfs.org/reference/static/#calendartxt).
- `arrivals_departures` "applies" [`stop_times`](https://gtfs.org/reference/static/#stop_timestxt) to [`trips`](https://gtfs.org/reference/static/#tripstxt) and `service_days` to give you all arrivals/departures at each stop with their *absolute* dates & times. It also resolves each stop's parent station ID & name.
- `connections` "applies" [`stop_times`](https://gtfs.org/reference/static/#stop_timestxt) to [`trips`](https://gtfs.org/reference/static/#tripstxt) and `service_days`, just like `arrivals_departures`, but gives you departure (at stop A) & arrival (at stop B) *pairs*.
- `shapes_aggregates` aggregates individual shape points in [`shapes`](https://gtfs.org/reference/static/#shapestxt) into a [PostGIS `LineString`](http://postgis.net/workshops/postgis-intro/geometries.html#linestrings).

As an example, we're going to use the `arrivals_departures` view to query all *absolute* departures at `900000120003` (*S Ostkreuz Bhf (Berlin)*) between `2021-02-23T12:30+01` and  `2021-02-23T12:35+01`:

```sql
SELECT *
FROM arrivals_departures
WHERE station_id = '900000120003'
AND t_departure >= '2021-02-23T12:30+01' AND t_departure <= '2021-02-23T12:35+01'
```

`route_id` | `route_short_name` | `route_type` | `trip_id` | `date` | `stop_sequence` | `t_arrival` | `t_departure` | `stop_id` | `stop_name` | `station_id` | `station_name`
-|-|-|-|-|-|-|-|-|-|-|-
`10148_109` | `S3 ` | `109` | `145825009` | `2021-02-23 00:00:00` | `19` | `2021-02-23 12:31:24+01` | `2021-02-23 12:32:12+01` | `060120003653` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`10148_109` | `S3` | `109` | `145825160` | `2021-02-23 00:00:00` | `10` | `2021-02-23 12:33:06+01` | `2021-02-23 12:33:54+01` | `060120003654` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `145888587` | `2021-02-23 00:00:00` | `19` | `2021-02-23 12:33:54+01` | `2021-02-23 12:34:42+01` | `060120003653` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `145888694` | `2021-02-23 00:00:00` | `9` | `2021-02-23 12:30:36+01` | `2021-02-23 12:31:24+01` | `060120003654` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`10223_109` | `S41` | `109` | `151221298` | `2021-02-23 00:00:00` | `21` | `2021-02-23 12:30:24+01` | `2021-02-23 12:31:12+01` | `060120901551` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`17398_700` | `347` | `700` | `151089751` | `2021-02-23 00:00:00` | `15` | `2021-02-23 12:32:00+01` | `2021-02-23 12:32:00+01` | `070101006976` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`19040_100` | `RB14` | `100` | `151311540` | `2021-02-23 00:00:00` | `12` | `2021-02-23 12:26:00+01` | `2021-02-23 12:30:00+01` | `000008011162` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`
`22664_2` | `FEX` | `2` | `151311081` | `2021-02-23 00:00:00` | `1` | `2021-02-23 12:32:00+01` | `2021-02-23 12:34:00+01` | `000008011162` | `S Ostkreuz Bhf (Berlin)` | `900000120003` | `S Ostkreuz Bhf (Berlin)`


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

You can run queries with date+time values in any timezone (offset) and they will be processed correctly, but the output will always be in the database timezone (offset), unless you have explicitly used `AT TIME ZONE`.


### Exporting data efficiently

If you want to export data from the database, use the [`COPY` command](https://www.postgresql.org/docs/13/sql-copy.html); On my laptop, PostgreSQL 13 can export about 250k `connections` rows per second.

```shell
psql -c 'COPY (SELECT * FROM connections) TO STDOUT csv HEADER' | node transform-data.js >connections.csv
```

In the nested `SELECT` query, you can use features like `WHERE`, `ORDER BY` and `LIMIT`. Because `psql` passes on the exported data right away, you could stream it into another process.


## Correctness vs. Speed regarding GTFS Time Values

When matching time values from `stop_times` against dates from `calendar`/`calendar_dates`, you have to take into account that **GTFS Time values can be >24h and [are not relative to the beginning of the day but relative to noon - 12h](https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6)**.

This means that, in order to determine all *absolute* points in time where a particular trip departs at a particular stop, you *cannot* just loop over all "service dates" and add the time value (as in `beginning_of_date + departure_time`); Instead, for each date, you have to determine noon, subtract 12h and then apply the time, which might extend arbitrarily far into the following days.

Let's consider two examples:

- A `departure_time` of `26:59` with a trip running on `2021-03-01`: The time, applied to this specific date, "extends" into the following day, so it actually departs at `2021-03-02T02:59+01`.
- A departure time of `03:01` with a trip running on `2021-03-28`: This is where the standard -> DST switch happens in the `Europe/Berlin` timezone. Because the dep. time refers to noon - 12h (*not* to midnight), it actually happens at `2021-03-28T03:01+02` which is *not* `3h1m` after `2021-03-28T00:00+01`.

`gtfs-via-postgres` always prioritizes correctness over speed. Because it follows the GTFS semantics, when filtering `arrivals_departures` by *absolute* departure date+time, it cannot filter `service_days` (which a processed form of `calendar` & `calendar_dates`), because **even a date *before* the desired departure date+time range might still end up within when combined with a `departure_time` of e.g. `27:30`**; Instead, it has to consider all `service_days` and apply the `departure_time` to all of them to check if they're within the range.

However, values >48h are really rare. If you know (or want to assume) that your feed *does not* have `arrival_time`/`departure_time` values larger than a certain amount, you can filter on `date` when querying `arrivals_departures`; This allows PostgreSQL to reduce the number of joins and calendar calculations by *a lot*.

For example, when querying all *absolute* departures at `900000120003` (*S Ostkreuz Bhf (Berlin)*) between `2021-02-23T12:30+01` and  `2021-02-23T12:35+01` within the [2021-02-12 *VBB* feed](https://vbb-gtfs.jannisr.de/2021-02-12/), filtering by `date` speeds it up nicely:

`station_id` filter | `date` filter | query time
-|-|-
`900000120003` | *none* | 970ms
`900000120003` | `2021-02-13` >= `date` < `2021-03-08` | 200ms
`900000120003` | `2021-02-23` >= `date` < `2021-02-24` | 160ms
`900000120003` | `2021-02-22` > `date` < `2021-02-24` | 155ms
*none* | *none* | 280s
*none* | `2021-02-13` >= `date` < `2021-03-08` | 18s
*none* | `2021-02-22` > `date` < `2021-02-24` | 1.5s


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
