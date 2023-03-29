# gtfs-via-postgres

**Import [GTFS Static/Schedule](https://gtfs.org/schedule/) datasets into a [PostgreSQL database](https://www.postgresql.org)**, to allow for efficient querying and analysis.

[![npm version](https://img.shields.io/npm/v/gtfs-via-postgres.svg)](https://www.npmjs.com/package/gtfs-via-postgres)
[![binary build status](https://img.shields.io/github/actions/workflow/status/public-transport/gtfs-via-postgres/publish.yml?label=binary%20build)](https://github.com/public-transport/gtfs-via-postgres/actions)
[![Prosperity/Apache license](https://img.shields.io/static/v1?label=license&message=Prosperity%2FApache&color=0997E8)](#license)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-postgres.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)

- ✅ handles [daylight saving time correctly](#correctness-vs-speed-regarding-gtfs-time-values) but retains reasonable lookup performance
- ✅ supports `frequencies.txt`
- ✨ joins `stop_times.txt`/`frequencies.txt`, `calendar.txt`/`calendar_dates.txt`, `trips.txt`, `route.txt` & `stops.txt` into [views](https://www.postgresql.org/docs/14/sql-createview.html) for straightforward data analysis (see below)
- 🚀 is carefully optimised to let PostgreSQL's query planner do its magic, yielding quick lookups even with large datasets (see [performance section](#performance))
- ✅ validates and imports `translations.txt`
- ✨ exposes (almost) all data via GraphQL using [PostGraphile](https://www.graphile.org/postgraphile/introduction/)


## Installation

```shell
npm install -g gtfs-via-postgres
```

Or use [`npx`](https://npmjs.com/package/npx). ✨

There are also [prebuilt binaries available](https://github.com/public-transport/gtfs-via-postgres/releases/latest).

*Note:* `gtfs-via-postgres` **needs PostgreSQL >=14** to work, as it uses the [`WITH … AS NOT MATERIALIZED`](https://www.postgresql.org/docs/14/queries-with.html#id-1.5.6.12.7) syntax. You can check your PostgreSQL server's version with `psql -t -c 'SELECT version()'`.


## Getting Started

If you have a `.zip` GTFS feed, unzip it into individual files.

We're going to use the [2022-02-25 *VBB* feed](https://vbb-gtfs.jannisr.de/2022-02-25/) as an example, which consists of individual files already.

```sh
wget --compression auto \
    -r --no-parent --no-directories -R .csv.gz \
    -P gtfs -N 'https://vbb-gtfs.jannisr.de/2022-02-25/'
# …
# Downloaded 14 files in 20s.
ls -lh gtfs
# 3.3K agency.csv
#  97K calendar.csv
# 1.1M calendar_dates.csv
# 2.5K datapackage.json
#  64B frequencies.csv
# 5.9K levels.csv
# 246B license
# 8.3M pathways.csv
#  49K routes.csv
# 146M shapes.csv
# 368M stop_times.csv
# 5.0M stops.csv
# 4.7M transfers.csv
#  16M trips.csv
```

Depending on your specific setup, configure access to the PostgreSQL database via [`PG*` environment variables](https://www.postgresql.org/docs/14/libpq-envars.html):

```sh
export PGUSER=postgres
export PGPASSWORD=password
env PGDATABASE=postgres psql -c 'create database vbb_2022_02_25'
export PGDATABASE=vbb_2022_02_25
```

Install `gtfs-via-postgres` and use it to import the GTFS data:

```sh
npm install -D gtfs-via-postgres
npm exec -- gtfs-to-sql --require-dependencies -- gtfs/*.csv | psql -b
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

Importing will take 10s to 10m, depending on the size of the feed. On an [M1 MacBook Air](https://en.wikipedia.org/wiki/MacBook_Air_(Apple_silicon)#Third_generation_(Retina_with_Apple_silicon)), importing the above feed takes about 4m; Importing the [260kb 2021-10-06 Amtrak feed](https://transitfeeds.com/p/amtrak/1136/20211006) takes 6s.

In addition to a table for each GTFS file, `gtfs-via-postgres` adds these views to help with real-world analysis:

- `service_days` ([materialized](https://www.postgresql.org/docs/13/sql-creatematerializedview.html)) "applies" [`calendar_dates`](https://gtfs.org/reference/static/#calendar_datestxt) to [`calendar`](https://gtfs.org/reference/static/#calendartxt) to give you all days of operation for each "service" defined in [`calendar`](https://gtfs.org/reference/static/#calendartxt).
- `arrivals_departures` "applies" [`stop_times`](https://gtfs.org/reference/static/#stop_timestxt)/[`frequencies`](https://gtfs.org/reference/static/#frequenciestxt) to [`trips`](https://gtfs.org/reference/static/#tripstxt) and `service_days` to give you all arrivals/departures at each stop with their *absolute* dates & times. It also resolves each stop's parent station ID & name.
- `connections` "applies" [`stop_times`](https://gtfs.org/reference/static/#stop_timestxt)/[`frequencies`](https://gtfs.org/reference/static/#frequenciestxt) to [`trips`](https://gtfs.org/reference/static/#tripstxt) and `service_days`, just like `arrivals_departures`, but gives you departure (at stop A) & arrival (at stop B) *pairs*.
- `shapes_aggregates` aggregates individual shape points in [`shapes`](https://gtfs.org/reference/static/#shapestxt) into a [PostGIS `LineString`](http://postgis.net/workshops/postgis-intro/geometries.html#linestrings).

As an example, we're going to use the `arrivals_departures` view to query all *absolute* departures at `de:11000:900120003` (*S Ostkreuz Bhf (Berlin)*) between `2022-03-23T12:30+01` and  `2022-03-23T12:35+01`:

```sql
SELECT *
FROM arrivals_departures
WHERE station_id = 'de:11000:900120003'
AND t_departure >= '2022-03-23T12:30+01' AND t_departure <= '2022-03-23T12:35+01'
```

`route_id` | `route_short_name` | `route_type` | `trip_id` | `date` | `stop_sequence` | `t_arrival` | `t_departure` | `stop_id` | `stop_name` | `station_id` | `station_name`
-|-|-|-|-|-|-|-|-|-|-|-
`10148_109` | `S3` | `109` | `169035756` | `2022-03-23 00:00:00` | `19` | `2022-03-23 12:31:24+01` | `2022-03-23 12:32:12+01` | `de:11000:900120003:2:53` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10148_109` | `S3` | `109` | `169035899` | `2022-03-23 00:00:00` | `10` | `2022-03-23 12:33:06+01` | `2022-03-23 12:33:54+01` | `de:11000:900120003:3:55` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `169128381` | `2022-03-23 00:00:00` | `19` | `2022-03-23 12:33:54+01` | `2022-03-23 12:34:42+01` | `de:11000:900120003:2:53` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `169128495` | `2022-03-23 00:00:00` | `9` | `2022-03-23 12:30:36+01` | `2022-03-23 12:31:24+01` | `de:11000:900120003:3:55` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10223_109` | `S41` | `109` | `169054370` | `2022-03-23 00:00:00` | `21` | `2022-03-23 12:30:24+01` | `2022-03-23 12:31:12+01` | `de:11000:900120003:5:58` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10227_109` | `S42` | `109` | `169071882` | `2022-03-23 00:00:00` | `6` | `2022-03-23 12:30:30+01` | `2022-03-23 12:31:12+01` | `de:11000:900120003:5:59` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`19040_100` | `RB14` | `100` | `178748721` | `2022-03-23 00:00:00` | `13` | `2022-03-23 12:30:00+01` | `2022-03-23 12:30:00+01` | `de:11000:900120003:1:50` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`22664_2` | `FEX` | `2` | `178748125` | `2022-03-23 00:00:00` | `1` | `2022-03-23 12:32:00+01` | `2022-03-23 12:34:00+01` | `de:11000:900120003:4:57` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`

### translations

There are some `…_translated` views (e.g. `stops_translated`, `arrivals_departures_translated`) that
- join their respective source table with `translations`, so that each (translatable) field is translated in every provided language,
- add a `…_lang` column for each translated column (e.g. `stop_name_lang` for `stop_name`) that indicates the language of the translation.

Assuming a dataset with `translations.csv`, let's query all stops with a `de-CE` translation, falling back to the untranslated values:

```sql
SELECT
    stop_id,
    stop_name, stop_name_lang,
    stop_url,
FROM stops_translated
WHERE (stop_name_lang = 'de-CH' OR stop_name_lang IS NULL)
AND (stop_url_lang = 'de-CH' OR stop_url_lang IS NULL)
```


## Usage

```
Usage:
    gtfs-to-sql [options] [--] <gtfs-file> ...
Options:
    --silent                  -s  Don't show files being converted.
    --require-dependencies    -d  Require files that the specified GTFS files depend
                                  on to be specified as well (e.g. stop_times.txt
                                  requires trips.txt). Default: false
    --ignore-unsupported      -u  Ignore unsupported files. Default: false
    --route-types-scheme          Set of route_type values to support.
                                    - basic: core route types in the GTFS spec
                                    - google-extended: Extended GTFS Route Types [1]
                                    - tpeg-pti: proposed TPEG-PTI-based route types [2]
                                    Default: google-extended
    --trips-without-shape-id      Don't require trips.txt items to have a shape_id.
    --routes-without-agency-id    Don't require routes.txt items to have an agency_id.
    --stops-without-level-id      Don't require stops.txt items to have a level_id.
                                  Default if levels.txt has not been provided.
    --stops-location-index        Create a spatial index on stops.stop_loc for efficient
                                    queries by geolocation.
    --schema                      The schema to use for the database. Default: public
    --postgraphile                Tweak generated SQL for PostGraphile usage.
                                    https://www.graphile.org/postgraphile/
Examples:
    gtfs-to-sql some-gtfs/*.txt | psql -b # import into PostgreSQL
    gtfs-to-sql -u -- some-gtfs/*.txt | gzip >gtfs.sql # generate a gzipped SQL dump

[1] https://developers.google.com/transit/gtfs/reference/extended-route-types
[2] https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
```

Some notable limitations mentioned in the [PostgreSQL 14 documentation on date/time types](https://www.postgresql.org/docs/14/datatype-datetime.html):

> For `timestamp with time zone`, the internally stored value is always in UTC (Universal Coordinated Time, traditionally known as Greenwich Mean Time, GMT). An input value that has an explicit time zone specified is converted to UTC using the appropriate offset for that time zone.

> When a `timestamp with time zone` value is output, it is always converted from UTC to the current `timezone` zone, and displayed as local time in that zone. To see the time in another time zone, either change `timezone` or use the `AT TIME ZONE` construct […].

You can run queries with date+time values in any timezone (offset) and they will be processed correctly, but the output will always be in the database timezone (offset), unless you have explicitly used `AT TIME ZONE`.

### With Docker

*Note:* Just like the `npm`-installed variant, the Docker integration too assumes that your GTFS dataset consists of individual files (i.e. unzipped).

Instead of installing via `npm`, you can use [the `publictransport/gtfs-via-postgres` Docker image](https://hub.docker.com/r/publictransport/gtfs-via-postgres):

```shell
# variant A: use Docker image just to convert GTFS to SQL
docker run --rm --volume /path/to/gtfs:/gtfs \
	publictransport/gtfs-via-postgres --require-dependencies -- '/gtfs/*.csv' | psql -b
```

*Note:* Remember to pass the `/gtfs/*.csv` glob as a string (with `'`), so that it gets evaluated *inside* the Docker container.

With the code above, the `psql -b` process will run *outside* of the Docker container, so your host machine needs access to PostgreSQL.

If you want to directly import the GTFS data *from within the Docker container*, you need add `psql` to the image and run it from inside. To do that, write a new Dockerfile that extends the `publictransport/gtfs-via-postgres` image:

```Dockerfile
FROM publictransport/gtfs-via-postgres
ENV PGPORT=5432 PGUSER=postgres
WORKDIR /gtfs
# pass all arguments into gtfs-via-postgres, pipe output into psql:
ENTRYPOINT ["/bin/sh", "-c", "gtfs-via-postgres $0 $@ | psql -b"]
```

```shell
# start PostgreSQL DB in another container "db"
docker run docker run --name db -p 5432:5432 -e POSTGRES_PASSWORD=password postgis/postgis

# variant B: use Docker image to convert GTFS to SQL and import it directly
docker build -t import-gtfs . # build helper Docker image from Dockerfile
docker run --rm --volume /path/to/gtfs:/gtfs \
	--link db -e PGHOST=db -e PGPASSWORD=password \
	import-gtfs --require-dependencies -- '/gtfs/*.csv'
```

### Exporting data efficiently

If you want to export data from the database, use the [`COPY` command](https://www.postgresql.org/docs/14/sql-copy.html); On an [M1 MacBook Air](https://en.wikipedia.org/wiki/MacBook_Air_(Apple_silicon)#Third_generation_(Retina_with_Apple_silicon)), PostgreSQL 14 can export about 500k `connections` rows per second.

```shell
psql -c 'COPY (SELECT * FROM connections) TO STDOUT csv HEADER' >connections.csv
```

In the nested `SELECT` query, you can use features like `WHERE`, `ORDER BY` and `LIMIT`. Because `psql` passes on the exported data right away, you could stream it into another process.

### Querying stops by location efficiently

If you want to find stops by (geo)location, run `gtfs-via-postgres` with `--stops-location-index`. This will create a [spatial index](https://postgis.net/workshops/postgis-intro/indexing.html) on `stops.stop_loc`, so that most [PostGIS functions & operators](https://postgis.net/docs/manual-3.2/reference.html#Measurement_Functions) make use of it.

### GraphQL support

The `--postgraphile` flag changes the SQL generated by `gtfs-via-postgres` slightly, so that you get a reasonably idiomatic GraphQL API out-of-the-box when running [PostGraphile](https://www.graphile.org/postgraphile/) v4 on it:

```shell
# import data into PostgreSQL with PostGraphile tweaks
npm exec -- gtfs-to-sql -d --postgraphile -- gtfs/*.csv | psql -b
```

`gtfs-via-postgres` *doesn't* specify PostGraphile as a regular dependency, but as `peerDependencies`, in order to stay lightweight for users who don't need the GraphQL interface. Some versions of some package managers install unmet peer dependencies, some don't. Let's make sure that PostGraphile (and its plugins) are installed:

```shell
npm install \
    postgraphile@4.12 \
    @graphile-contrib/pg-simplify-inflector@^6.1 \
    @graphile/postgis@^0.2.0-0
```

The `serve-gtfs-via-graphql` helper script configures and runs PostGraphile. With `NODE_ENV=development`, it will

- serve a fully configured [GraphiQL UI](https://graphql-dotnet.github.io/docs/getting-started/graphiql/) at `/graphiql`
- provide more errors on database & query errors
- allow [using PostgreSQL's `EXPLAIN` via GraphQL](https://www.graphile.org/postgraphile/debugging/#via-postgraphiql-explain)

```
# listens on port 3000, this can be changed using $PORT
env NODE_ENV=development npm exec -- serve-gtfs-via-graphql
```

**As an example for the GraphQL API, check out the [test query](test/sample-gtfs-feed-postgraphile-test.graphql)** or open the [GraphiQL UI](https://github.com/graphql/graphiql) served at [`localhost:3000/graphiql`](http://localhost:3000/graphiql).


## Correctness vs. Speed regarding GTFS Time Values

When matching time values from `stop_times` against dates from `calendar`/`calendar_dates`, you have to take into account that **GTFS Time values can be >24h and [are not relative to the beginning of the day but relative to noon - 12h](https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6)**. ([There are a few libraries that don't do this.](https://github.com/r-transit/tidytransit/issues/175#issuecomment-979213277))

This means that, in order to determine all *absolute* points in time where a particular trip departs at a particular stop, you *cannot* just loop over all "service dates" and add the time value (as in `beginning_of_date + departure_time`); Instead, for each date, you have to determine noon, subtract 12h and then apply the time, which might extend arbitrarily far into the following days.

Let's consider two examples:

- A `departure_time` of `26:59:00` with a trip running on `2021-03-01`: The time, applied to this specific date, "extends" into the following day, so it actually departs at `2021-03-02T02:59+01`.
- A departure time of `03:01:00` with a trip running on `2021-03-28`: This is when the standard -> DST switch happens in the `Europe/Berlin` timezone. Because the dep. time refers to noon - 12h (*not* to midnight), it actually happens at `2021-03-28T03:01+02` which is *not* `3h1m` after `2021-03-28T00:00+01`.

`gtfs-via-postgres` always prioritizes correctness over speed. Because it follows the GTFS semantics, when filtering `arrivals_departures` by *absolute* departure date+time, it cannot filter `service_days` (which is `calendar` and `calendar_dates` combined), because **even a date *before* the date of the desired departure date+time range might still end up within the range, when combined with a `departure_time` of e.g. `27:30:00`**; Instead, it has to consider all `service_days` and apply the `departure_time` to all of them to check if they're within the range.

However, values >48h are really rare. If you know (or want to assume) that your feed *does not* have `arrival_time`/`departure_time` values larger than a certain amount, you can filter on `date` when querying `arrivals_departures`; This allows PostgreSQL to reduce the number of joins and calendar calculations by *a lot*.

For example, when querying all *absolute* departures at `de:11000:900120003` (*S Ostkreuz Bhf (Berlin)*) between `2022-03-23T12:30+01` and  `2022-03-23T12:35+01` within the [2022-02-25 *VBB* feed](https://vbb-gtfs.jannisr.de/2022-02-25/), filtering by `date` speeds it up nicely (Apple M1, PostgreSQL 14.2):

`station_id` filter | `date` filter | query time | nr of results
-|-|-|-
`de:11000:900120003` | *none* | 230ms | ~574k
`de:11000:900120003` | `2022-03-13` >= `date` < `2022-04-08` | 105ms | ~51k
`de:11000:900120003` | `2022-03-23` >= `date` < `2022-03-24` | 55ms | ~2k
`de:11000:900120003` | `2022-03-22` > `date` < `2022-03-24` | 55ms | ~2k
*none* | *none* | 192s | 370m
*none* | `2022-03-13` >= `date` < `2022-04-08` | 34s | ~35m
*none* | `2022-03-22` > `date` < `2022-03-24` | 2.4s | ~1523k


## Performance

With all use cases I could think of, `gtfs-via-postgres` is reasonably fast. If there's a particular kind of query that you think should be faster, please [open an Issue](https://github.com/public-transport/gtfs-via-postgres/issues/new)!

The following benchmarks were run with the [2022-07-01 VBB GTFS dataset](https://vbb-gtfs.jannisr.de/2022-07-01/) (41k `stops`, 6m `stop_times`, 207m arrivals/departures) on an M1 laptop; All measurements are in milliseconds.

| query | avg | min | p25 | p50 | p75 | p95 | p99 | max | iterations |
| - | - | - | - | - | - | - | - | - | - |
| <pre>SELECT *<br>FROM stops<br>ORDER BY ST_Distance(stop_loc::geometry, ST_SetSRID(ST_MakePoint(9.7, 50.547), 4326)) ASC<br>LIMIT 100</pre> | 16.84 | 16.421 | 16.74 | 16.77 | 16.81 | 17.25 | 20.03 | 20.631 | 100 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE route_short_name = 'S1'<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 27.77 | 26.994 | 27.61 | 27.74 | 27.85 | 28.47 | 29.86 | 30.14 | 100 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 275.65 | 272.239 | 273.74 | 275.29 | 276.59 | 280.18 | 281.45 | 281.923 | 40 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'<br>AND stop_sequence = 0</pre> | 202.48 | 199.638 | 200.39 | 201.55 | 204 | 207.88 | 211.66 | 212.071 | 50 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 6.2 | 6.076 | 6.1 | 6.12 | 6.15 | 6.79 | 7.63 | 8.456 | 100 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE trip_id = '168977951'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 2.14 | 2.041 | 2.06 | 2.14 | 2.15 | 2.26 | 2.53 | 4.114 | 100 |
| <pre>SELECT count(*)<br>FROM arrivals_departures<br>WHERE stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)</pre> | 61.79 | 60.952 | 61.26 | 61.51 | 61.85 | 64.31 | 64.66 | 65.298 | 100 |
| <pre>SELECT count(*)<br>FROM arrivals_departures<br>WHERE stop_id = 'definitely-non-existent'</pre> | 2.08 | 2.047 | 2.06 | 2.06 | 2.07 | 2.11 | 2.31 | 2.451 | 100 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 1577.91 | 1555.598 | 1561.93 | 1572.38 | 1592.68 | 1604.32 | 1606.46 | 1606.992 | 10 |
| <pre>SELECT *<br>FROM connections<br>WHERE route_short_name = 'S1'<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 85.27 | 78.838 | 80.98 | 82.99 | 91.25 | 93.18 | 94.78 | 94.899 | 100 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 306.27 | 297.505 | 300.15 | 302.1 | 311.19 | 319.82 | 333.09 | 335.374 | 40 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'<br>AND from_stop_sequence = 0</pre> | 231.07 | 224.655 | 229.2 | 230.86 | 231.86 | 239.84 | 247.15 | 253.035 | 50 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 12.6 | 12.084 | 12.35 | 12.46 | 12.67 | 13.45 | 15.35 | 15.992 | 100 |
| <pre>SELECT *<br>FROM connections<br>WHERE trip_id = '168977951'<br>AND date > '2022-08-08' AND date <= '2022-08-09'</pre> | 3.17 | 3.057 | 3.09 | 3.12 | 3.15 | 3.46 | 4.18 | 4.709 | 100 |
| <pre>SELECT count(*)<br>FROM connections<br>WHERE from_stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)</pre> | 92.47 | 91.159 | 91.56 | 92.17 | 92.78 | 94.72 | 96.47 | 96.574 | 100 |
| <pre>SELECT count(*)<br>FROM connections<br>WHERE from_stop_id = 'definitely-non-existent'</pre> | 18.35 | 17.877 | 18.02 | 18.12 | 18.44 | 19.31 | 20.66 | 21.05 | 100 |
| <pre>SELECT *<br>FROM connections<br>WHERE t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'<br>AND date > '2022-08-08' AND date <= '2022-08-09'<br>ORDER BY t_departure<br>LIMIT 100</pre> | 9050.33 | 9001.322 | 9013.13 | 9033.42 | 9078.03 | 9119.54 | 9132.11 | 9135.253 | 7 |


## Related Projects

There are some projects that are very similar to `gtfs-via-postgres`:

### Node-GTFS

[Node-GTFS (`gtfs` npm package)](https://github.com/BlinkTagInc/node-gtfs) is widely used. It covers three use cases: importing GTFS into an [SQLite](https://sqlite.org/) DB, exporting GTFS/GeoJSON from it, and generating HTML or charts for humans.

I don't use it though because

- it doesn't handle GTFS Time values correctly ([1](https://github.com/BlinkTagInc/node-gtfs/blob/master/lib/utils.js#L36-L46)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L233), checked on 2022-03-01)
- it doesn't always work in a streaming/iterative way ([1](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/export.js#L65)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/geojson-utils.js#L118-L126), checked on 2022-03-01)
- sometimes does synchronous fs calls ([1](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L65)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L298), checked on 2022-03-01)

### gtfs-sequelize

[gtfs-squelize](https://github.com/evansiroky/gtfs-sequelize) uses [sequelize.js](https://sequelize.org) to import a GTFS feed and query the DB.

I don't use it because

- it doesn't handle GTFS Time values correctly ([1](https://github.com/evansiroky/gtfs-sequelize/blob/ba101fa82e730694c536c43e615ff38fd264a65b/lib/gtfsLoader.js#L616-L617)/[2](https://github.com/evansiroky/gtfs-sequelize/blob/ba101fa82e730694c536c43e615ff38fd264a65b/lib/gtfsLoader.js#L24-L33), cheked on 2022-03-01)
- it doesn't provide much tooling for analyzing all arrivals/departures (checked on 2022-03-01)
- some of its operations are quite slow, because they fetch relatved records of a record via JS instead of using `JOIN`s

### gtfs-sql-importer

There are several forks of the [original outdated project](https://github.com/cbick/gtfs_SQL_importer); [fitnr's fork](https://github.com/fitnr/gtfs-sql-importer) seems to be the most recent one.

The project has a slightly different goal than `gtfs-via-postgres`: While `gtfs-sql-importer` is designed to import multiple versions of a GTFS dataset in an idempotent fashion, `gtfs-via-postgres` assumes that *one* (version of a) GTFS dataset is imported into *one* DB exactly once.

`gtfs-via-postgres` aims to provide more tools – e.g. the `arrivals_departures` & `connections` views – to help with the analysis of a GTFS dataset, whereas `gtfs-sql-importer` just imports the data.

### other related projects

- [gtfsdb](https://github.com/OpenTransitTools/gtfsdb) – Python library for converting GTFS files into a relational database.
- [gtfspy](https://github.com/CxAalto/gtfspy) – Public transport network analysis using Python and SQLite.
- [GTFS Kit](https://github.com/mrcagney/gtfs_kit) – A Python 3.6+ tool kit for analyzing General Transit Feed Specification (GTFS) data.
- [GtfsToSql](https://github.com/OpenMobilityData/GtfsToSql) – Parses a GTFS feed into an SQL database (Java)
- [gtfs-to-sqlite](https://github.com/aytee17/gtfs-to-sqlite) – A tool for generating an SQLite database from a GTFS feed. (Java)
- [gtfs-lib](https://github.com/conveyal/gtfs-lib) – Java library & CLI for importing GTFS files into a PostgreSQL database.
- [gtfs-schema](https://github.com/tyleragreen/gtfs-schema) – PostgreSQL schemas for GTFS feeds. (plain SQL)
- [markusvalo/HSLtraffic](https://github.com/markusvalo/HSLtraffic) – Scripts to create a PostgreSQL database for HSL GTFS-data. (plain SQL)


## License

This project is dual-licensed: **My ([@derhuerst](https://github.com/derhuerst)) contributions are licensed under the [*Prosperity Public License*](https://prosperitylicense.com), [contributions of other people](https://github.com/public-transport/gtfs-via-postgres/graphs/contributors) are licensed as [Apache 2.0](https://apache.org/licenses/LICENSE-2.0)**.

> This license allows you to use and share this software for noncommercial purposes for free and to try this software for commercial purposes for thirty days.

> Personal use for research, experiment, and testing for the benefit of public knowledge, personal study, private entertainment, hobby projects, amateur pursuits, or religious observance, without any anticipated commercial application, doesn’t count as use for a commercial purpose.

[Get in touch with me](https://jannisr.de/) to buy a commercial license or read more about [why I sell private licenses for my projects](https://gist.github.com/derhuerst/0ef31ee82b6300d2cafd03d10dd522f7).


## Contributing

If you have a question or need support using `gtfs-via-postgres`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/public-transport/gtfs-via-postgres/issues).

By contributing, you agree to release your modifications under the [Apache 2.0 license](LICENSE-APACHE).
