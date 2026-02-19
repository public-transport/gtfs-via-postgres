# gtfs-via-duckdb

**Import [GTFS Static/Schedule](https://gtfs.org/documentation/schedule/reference/) datasets into a [DuckDB database](https://duckdb.org)**, to allow for efficient querying and analysis.

[![npm version](https://img.shields.io/npm/v/gtfs-via-duckdb.svg)](https://www.npmjs.com/package/gtfs-via-duckdb)
[![binary build status](https://img.shields.io/github/actions/workflow/status/public-transport/gtfs-via-duckdb/publish.yml?label=binary%20build)](https://github.com/public-transport/gtfs-via-duckdb/actions)
[![Prosperity/Apache license](https://img.shields.io/static/v1?label=license&message=Prosperity%2FApache&color=0997E8)](#license)
![minimum Node.js version](https://img.shields.io/node/v/gtfs-via-duckdb.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)

- ✅ handles [daylight saving time correctly](#correctness-vs-speed-regarding-gtfs-time-values) but retains reasonable lookup performance
- ✅ supports `frequencies.txt`
- ✨ joins `stop_times.txt`/`frequencies.txt`, `calendar.txt`/`calendar_dates.txt`, `trips.txt`, `route.txt` & `stops.txt` into [views](https://duckdb.org/docs/stable/sql/statements/create_view) for straightforward data analysis (see below)
- 🚀 is carefully optimised to let DuckDB's query planner do its magic, yielding quick lookups even with large datasets (see [performance section](#performance))
- ✅ validates and imports `translations.txt`

To work with the time-related data (`stop_times` etc.), `gtfs-via-duckdb` supports two "mental models":

- the time-*unexpanded* data that is almost directly taken from the GTFS Schedule data – This is useful if you want to do network analysis.
- the time-*expanded* view that "applies" every trip's `stop_times` rows to all of its service days – This is useful for routing & queries from the traveller's perspective.

> [!NOTE]
> `gtfs-via-duckdb` is a fork of [`gtfs-via-postgres`](https://github.com/public-transport/gtfs-via-postgres). Refer to the [comparison below](#gtfs-via-postgres) for details.


## Installation

```shell
npm install -g gtfs-via-duckdb
```

Or use [`npx`](https://npmjs.com/package/npx). ✨

There are also [prebuilt binaries](https://github.com/public-transport/gtfs-via-duckdb/releases/latest) and [Docker images](https://github.com/public-transport/gtfs-via-duckdb/pkgs/container/gtfs-via-duckdb) available.

> [!NOTE]
> `gtfs-via-duckdb` **needs DuckDB >=1.2** and its [`icu`](https://duckdb.org/docs/stable/extensions/icu) and [`spatial`](https://duckdb.org/docs/stable/extensions/spatial/overview) extensions to work.


## Getting Started

Install the DuckDB [`icu`](https://duckdb.org/docs/stable/extensions/icu) and [`spatial`](https://duckdb.org/docs/stable/extensions/spatial/overview) extensions.

```shell
duckdb_cli -c 'INSTALL icu'
duckdb_cli -c 'INSTALL spatial'
```

If you have a `.zip` GTFS feed, unzip it into individual files.

We're going to use the [2025-05-21 *VBB* feed](https://vbb-gtfs.jannisr.de/2025-05-21/) as an example, which consists of individual files already.

```sh
wget --compression auto \
    -r --no-parent --no-directories -R .csv.gz -R .csv.br \
    -P gtfs -N 'https://vbb-gtfs.jannisr.de/2025-05-21/'
# …
# Downloaded 14 files in 20s.
ls -lh gtfs
# 3.2K agency.csv
# 107K calendar.csv
# 1.2M calendar_dates.csv
# 2.5K datapackage.json
#  64B frequencies.csv
# 6.1K levels.csv
# 246B license
# 8.9M pathways.csv
#  50K routes.csv
# 152M shapes.csv
# 383M stop_times.csv
# 7.0M stops.csv
# 3.0M transfers.csv
#  17M trips.csv
```

Install `gtfs-via-duckdb` and use it to import the GTFS data:

```sh
npm install -D gtfs-via-duckdb
npm exec -- gtfs-to-duckdb --require-dependencies -- gtfs.duckdb gtfs/*.csv
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

Importing will take a few seconds to a few minutes, depending on the size of the feed. On an [M2](https://en.wikipedia.org/wiki/Apple_M2) laptop, importing the above feed takes about 30s.

In addition to a table for each GTFS file, `gtfs-via-duckdb` adds these views to help with real-world analysis:

- `service_days` (table) "applies" [`calendar_dates`](https://gtfs.org/documentation/schedule/reference/#calendar_datestxt) to [`calendar`](https://gtfs.org/documentation/schedule/reference/#calendartxt) to give you all days of operation for each "service" defined in [`calendar`](https://gtfs.org/documentation/schedule/reference/#calendartxt).
- `arrivals_departures` "applies" [`stop_times`](https://gtfs.org/documentation/schedule/reference/#stop_timestxt)/[`frequencies`](https://gtfs.org/documentation/schedule/reference/#frequenciestxt) to [`trips`](https://gtfs.org/documentation/schedule/reference/#tripstxt) and `service_days` to give you all arrivals/departures at each stop with their *absolute* dates & times. It also resolves each stop's parent station ID & name.
- `connections` "applies" [`stop_times`](https://gtfs.org/documentation/schedule/reference/#stop_timestxt)/[`frequencies`](https://gtfs.org/documentation/schedule/reference/#frequenciestxt) to [`trips`](https://gtfs.org/documentation/schedule/reference/#tripstxt) and `service_days`, just like `arrivals_departures`, but gives you departure (at stop A) & arrival (at stop B) *pairs*.
- `shapes_aggregated` aggregates individual shape points in [`shapes`](https://gtfs.org/documentation/schedule/reference/#shapestxt) into a [`LineString`](https://duckdb.org/docs/stable/extensions/spatial/overview#the-geometry-type).
- `stats_by_route_date` provides the number of arrivals/departures by route ID and date. – [read more](docs/analysis/feed-by-route-date.md)
- `stats_by_agency_route_stop_hour` provides the number of arrivals/departures by agency ID, route ID, stop ID & hour. – [read more](docs/analysis/feed-by-agency-route-stop-and-hour.md)
- In contrast to `stats_by_route_date` & `stats_by_agency_route_stop_hour`, `stats_active_trips_by_hour` provides the number of *currently running* trips for each hour in the feeds period of time.

As an example, we're going to use the `arrivals_departures` view to query all *absolute* departures at `de:11000:900120003` (*S Ostkreuz Bhf (Berlin)*) between `2022-03-23T12:30:00+01` and  `2022-03-23T12:35:00+01`:

```sql
SELECT *
FROM arrivals_departures
WHERE station_id = 'de:11000:900120003'
AND t_departure >= '2022-03-23T12:30:00+01' AND t_departure <= '2022-03-23T12:35:00+01'
```

`route_id` | `route_short_name` | `route_type` | `trip_id` | `date` | `stop_sequence` | `t_arrival` | `t_departure` | `stop_id` | `stop_name` | `station_id` | `station_name`
-|-|-|-|-|-|-|-|-|-|-|-
`10148_109` | `S3` | `109` | `169035756` | `2022-03-23 00:00:00` | `19` | `2022-03-23 12:31:24+01` | `2022-03-23 12:32:12+01` | `de:11000:900120003:2` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10148_109` | `S3` | `109` | `169035899` | `2022-03-23 00:00:00` | `10` | `2022-03-23 12:33:06+01` | `2022-03-23 12:33:54+01` | `de:11000:900120003:3` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `169128381` | `2022-03-23 00:00:00` | `19` | `2022-03-23 12:33:54+01` | `2022-03-23 12:34:42+01` | `de:11000:900120003:2` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10162_109` | `S7` | `109` | `169128495` | `2022-03-23 00:00:00` | `9` | `2022-03-23 12:30:36+01` | `2022-03-23 12:31:24+01` | `de:11000:900120003:3` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10223_109` | `S41` | `109` | `169054370` | `2022-03-23 00:00:00` | `21` | `2022-03-23 12:30:24+01` | `2022-03-23 12:31:12+01` | `de:11000:900120003:5` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`10227_109` | `S42` | `109` | `169071882` | `2022-03-23 00:00:00` | `6` | `2022-03-23 12:30:30+01` | `2022-03-23 12:31:12+01` | `de:11000:900120003:5` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`19040_100` | `RB14` | `100` | `178748721` | `2022-03-23 00:00:00` | `13` | `2022-03-23 12:30:00+01` | `2022-03-23 12:30:00+01` | `de:11000:900120003:1` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`
`22664_2` | `FEX` | `2` | `178748125` | `2022-03-23 00:00:00` | `1` | `2022-03-23 12:32:00+01` | `2022-03-23 12:34:00+01` | `de:11000:900120003:4` | `S Ostkreuz Bhf (Berlin)` | `de:11000:900120003` | `S Ostkreuz Bhf (Berlin)`

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
    import-gtfs-into-duckdb [options] [--] <path-to-duckdb> <gtfs-file> ...
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
                                    May also be a set of these schemes, separated by `,`.
                                    Default: google-extended
    --trips-without-shape-id      Don't require trips.txt items to have a shape_id.
                                    Default if shapes.txt has not been provided.
    --routes-without-agency-id    Don't require routes.txt items to have an agency_id.
    --stops-without-level-id      Don't require stops.txt items to have a level_id.
                                    Default if levels.txt has not been provided.
    --stops-location-index        Create a spatial index on stops.stop_loc for efficient
                                    queries by geolocation.
    --lower-case-lang-codes       Accept Language Codes (e.g. in feed_info.feed_lang)
                                    with a different casing than the official BCP-47
                                    language tags (as specified by the GTFS spec),
                                    by lower-casing all of them before validating.
                                    http://www.rfc-editor.org/rfc/bcp/bcp47.txt
                                    http://www.w3.org/International/articles/language-tags/
    --stats-by-route-date         Wether to generate a stats_by_route_date view
                                    letting you analyze all data per routes and/or date:
                                    - none: Don't generate a view.
                                    - view: Fast generation, slow access.
                                    - materialized-view: Slow generation, fast access.
                                    Default: none
    --stats-by-agency-route-stop-hour
                                  Generate a view letting you analyze arrivals/
                                    departures per route, stop and hour.
                                    The flag works like --stats-by-route-date.
    --stats-active-trips-by-hour  Generate a view letting you analyze the number of
                                    currently running trips over time, by hour.
                                    Like --stats-by-route-date, this flag accepts
                                    none, view & materialized-view.
    --import-metadata             Create functions returning import metadata:
                                    - gtfs_data_imported_at (timestamp with time zone)
                                    - gtfs_via_duckdb_version (text)
                                    - gtfs_via_duckdb_options (jsonb)
Notes:
    If you just want to check if the GTFS data can be imported but don't care about the
    resulting DuckDB database file, you can import into an in-memory database by specifying
    `:memory:` as the <path-to-duckdb>.
Examples:
    import-gtfs-into-duckdb some-gtfs.duckdb some-gtfs/*.txt

[1] https://developers.google.com/transit/gtfs/reference/extended-route-types
[2] https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
```

> [!TIP]
> DuckDB will always store `timestamp with time zone` values as microsends since the [Unix epoch](https://en.wikipedia.org/wiki/Unix_time) (similar to UTC). An input value with an explicit offset specified (e.g. `2022-03-04T05:06:07+08:00`) is converted to the internal representation using the offset.
> When the stored value is queried, it is always converted back into the current offset of the timezone specified by the `TimeZone` config. To see the time in another time zone, [change the `TimeZone` config](https://duckdb.org/docs/1.2/sql/data_types/timestamp#settings).
> TLDR: You can run queries with date+time values in any timezone (offset) and they will be processed correctly.

### With Docker

*Note:* Just like the `npm`-installed variant, the Docker integration too assumes that your GTFS dataset consists of individual files (i.e. unzipped).

Instead of installing via `npm`, you can use [the `ghcr.io/public-transport/gtfs-via-duckdb` Docker image](https://github.com/public-transport/gtfs-via-duckdb/pkgs/container/gtfs-via-duckdb):

*Note:* Remember to pass the `/gtfs/*.csv` glob as a string (with `'`), so that it gets evaluated *inside* the Docker container.

```shell
docker run --rm --volume /path/to/gtfs:/gtfs \
	ghcr.io/public-transport/gtfs-via-duckdb --require-dependencies -- '/gtfs/*.csv'
```

### Importing a GTFS Schedule feed continuously

[duckdb-gtfs-importer](https://github.com/OpenDataVBB/duckdb-gtfs-importer) imports [GTFS Schedule](https://gtfs.org/schedule/) data into DuckDBs databases using `gtfs-via-duckdb`. It allows running a production service (e.g. an API) on top of programmatically re-imported data from a periodically changing GTFS feed without downtime.

Because it works as [atomically](https://en.wikipedia.org/wiki/Atomicity_(database_systems)) as possible with PostgreSQL, it makes the import pipeline *robust* even if an import fails.

### Exporting data efficiently

If you want to export data from the database, use the [`COPY` command](https://duckdb.org/docs/stable/sql/statements/copy).

```shell
duckdb -c 'COPY (SELECT * FROM connections) TO STDOUT csv HEADER' my-gtfs.duckdb >my-gtfs-connections.csv
```

### Querying stops by location efficiently

If you want to find stops by (geo)location, run `gtfs-via-duckdb` with `--stops-location-index`. This will create a [spatial index](https://duckdb.org/docs/stable/extensions/spatial/r-tree_indexes) on `stops.stop_loc`, so that most spatial queries can be done efficiently.

### more guides

The [`docs` directory](docs) contains more instructions on how to use `gtfs-via-duckdb`.


## Correctness vs. Speed regarding GTFS Time Values

When matching time values from `stop_times` against dates from `calendar`/`calendar_dates`, you have to take into account that **GTFS Time values can be >24h and [are not relative to the beginning of the day but relative to noon - 12h](https://gist.github.com/derhuerst/574edc94981a21ef0ce90713f1cff7f6)**. ([There are a few libraries that don't do this.](https://github.com/r-transit/tidytransit/issues/175#issuecomment-979213277))

This means that, in order to determine all *absolute* points in time where a particular trip departs at a particular stop, you *cannot* just loop over all "service dates" and add the time value (as in `beginning_of_date + departure_time`); Instead, for each date, you have to determine noon, subtract 12h and then apply the time, which might extend arbitrarily far into the following days.

Let's consider two examples:

- A `departure_time` of `26:59:00` with a trip running on `2021-03-01`: The time, applied to this specific date, "extends" into the following day, so it actually departs at `2021-03-02T02:59:00+01`.
- A departure time of `03:01:00` with a trip running on `2021-03-28`: This is when the standard -> DST switch happens in the `Europe/Berlin` timezone. Because the dep. time refers to noon - 12h (*not* to midnight), it actually happens at `2021-03-28T03:01:00+02` which is *not* `3h1m` after `2021-03-28T00:00:00+01`.

`gtfs-via-duckdb` always prioritizes correctness over speed. Because it follows the GTFS semantics, when filtering `arrivals_departures` by *absolute* departure date+time, it cannot automatically filter `service_days` (which is `calendar` and `calendar_dates` combined), because **even a date *before* the date of the desired departure time frame might still end up *within*, when combined with a `departure_time` of e.g. `27:30:00`**; Instead, it has to consider all `service_days` and apply the `departure_time` to all of them to check if they're within the range.

However, if you determine your feed's largest `arrival_time`/`departure_time`, you can filter on `date` when querying `arrivals_departures`; This allows DuckDB to reduce the number of joins and calendar calculations by orders of magnitude, speeding up your queries significantly. `gtfs-via-duckdb` provides a low-level helper table `largest_arr_dep_time` for this, as well as two high-level helper functions `dates_filter_min(t_min)` & `dates_filter_max(t_max)` (see below).

For example, when querying all *absolute* departures at `de:11000:900100001` (*S+U Friedrichstr. (Berlin)*) between `2025-05-27T07:10:00+02` and  `2025-05-27T07:30:00+02` within the [2025-05-21 *VBB* feed](https://vbb-gtfs.jannisr.de/2025-05-21/), filtering by `date` speeds it up nicely (Apple M2, DuckDB v1.4.4):

`station_id` filter | `date` filter | `t_departure` filter | avg. query time | nr of results
-|-|-|-|-
`de:11000:900100001` | *none* | *none* | 1.1s | ~533k
`de:11000:900100001` | *none* | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 1.1s | 50
`de:11000:900100001` | `2025-05-20` >= `date` < `2025-06-03` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 130ms | 50
`de:11000:900100001` | `2025-05-25` >= `date` < `2025-05-28` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 80ms | 50
`de:11000:900100001` | `2025-05-27` >= `date` < `2025-05-28` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 73ms | 50
*none* | *none* | *none* | 22s (`count(*)` only) | ~263m
*none* | *none* | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 27s (`count(*)` only) | ~35k
*none* | `2025-05-20` >= `date` < `2025-06-03` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 2.1s | ~35k
*none* | `2025-05-25` >= `date` < `2025-05-28` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 773ms | ~35k
*none* | `2025-05-27` >= `date` < `2025-05-28` | `2025-05-27T07:10:00+02` >= `t_departure` < `2025-05-27T07:30:00+02` | 619ms | ~35k

Using `dates_filter_min(t_min)` & `dates_filter_max(t_max)`, we can easily filter by `date`. When filtering by `t_departure` (absolute departure date+time), `t_min` is the lower `t_departure` bound, whereas `t_max` is the upper bound. The VBB example above can be queried like this:

```sql
SELECT *
FROM arrivals_departures
-- filter by absolute departure date+time
WHERE t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'
-- allow "cutoffs" by filtering by date
AND "date" >= dates_filter_min('2025-05-27T07:10:00+02') -- evaluates to 2025-05-25
AND "date" <= dates_filter_max('2025-05-27T07:30:00+02') -- evaluates to 2023-03-27
```


## Performance

`gtfs-via-duckdb` is fast enough for most use cases I can think of. If there's a particular kind of query that you think should be faster, please [open an Issue](https://github.com/public-transport/gtfs-via-duckdb/issues/new)!

The following benchmarks were run with the [2025-05-21 VBB GTFS dataset](https://vbb-gtfs.jannisr.de/2025-05-21/) (41k `stops`, 6m `stop_times`, 207m arrivals/departures) using `gtfs-via-duckdb@5.0.0` and DuckDB v1.3 on an [M2](https://en.wikipedia.org/wiki/Apple_M2) laptop running macOS 14.7.7; All measurements are in milliseconds.

| query | avg | min | p25 | p50 | p75 | p95 | p99 | max | iterations |
| - | - | - | - | - | - | - | - | - | - |
| <pre>SELECT *<br>FROM stops<br>ORDER BY ST_Distance(stop_loc::geometry, ST_Point(9.7, 50.547)) ASC<br>LIMIT 100</pre> | 6.35 | 5.91 | 5.98 | 6.25 | 6.6 | 6.86 | 8.41 | 10.05 | 1576 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE route_short_name = 'S1'<br>AND t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'<br>AND date >= dates_filter_min('2025-05-27T07:10:00+02'::timestamp with time zone)<br>AND date <= dates_filter_max('2025-05-27T07:30+02'::timestamp with time zone)</pre> | 305.15 | 260.52 | 303.8 | 307.73 | 312.2 | 320.64 | 326.84 | 328.44 | 33 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')</pre> | 129.43 | 119.85 | 126.19 | 128.62 | 131.84 | 138.44 | 140.46 | 142 | 78 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')<br>AND stop_sequence = 0</pre> | 81.42 | 65.73 | 79.48 | 82.11 | 84.33 | 87.26 | 89.64 | 102.97 | 123 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')</pre> | 83.79 | 64.57 | 82.15 | 84.64 | 85.83 | 91.36 | 95.79 | 97.08 | 120 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE trip_id = '262623609' -- route_id=10144_109, route_short_name=S2<br>AND date = '2025-05-27'</pre> | 14.25 | 12.38 | 13.42 | 13.98 | 14.84 | 16.12 | 18.98 | 21.77 | 702 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)</pre> | 1077.27 | 1047.59 | 1061.76 | 1073.58 | 1096.8 | 1100.19 | 1100.72 | 1100.85 | 10 |
| <pre>SELECT count(*)<br>FROM arrivals_departures<br>WHERE stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)</pre> | 70.9 | 67.54 | 69.09 | 70.1 | 72.47 | 75.73 | 77.24 | 78.83 | 142 |
| <pre>SELECT count(*)<br>FROM arrivals_departures<br>WHERE stop_id = 'definitely-non-existent'</pre> | 23.61 | 20.31 | 21.97 | 22.67 | 24.84 | 27.51 | 30.78 | 40.43 | 424 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= '2025-05-25'<br>AND date <= '2025-05-27'</pre> | 1269.86 | 1139.03 | 1254.52 | 1272.09 | 1318.94 | 1329.66 | 1331.44 | 1331.89 | 8 |
| <pre>SELECT *<br>FROM arrivals_departures<br>WHERE t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'<br>AND "date" >= dates_filter_min('2025-05-27T07:10:00+02'::timestamp with time zone)<br>AND "date" <= dates_filter_max('2025-05-27T07:30:00+02'::timestamp with time zone)</pre> | 34148.21 | 32101.25 | 33459.12 | 34816.99 | 35171.69 | 35455.44 | 35512.2 | 35526.38 | 3 |
| <pre>SELECT *<br>FROM connections<br>WHERE route_short_name = 'S1'<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')</pre> | 8697.84 | 8629.78 | 8673.26 | 8716.73 | 8731.86 | 8743.96 | 8746.39 | 8746.99 | 3 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_station_id = 'de:11000:900194006' -- S Schöneweide/Sterndamm (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')</pre> | 1154.01 | 1070.8 | 1115.77 | 1156.47 | 1168.38 | 1243.5 | 1281.37 | 1290.84 | 9 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_station_id = 'de:11000:900194006' -- S Schöneweide/Sterndamm (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')<br>AND from_stop_sequence_consec = 0</pre> | 482.23 | 454.29 | 466.55 | 467.45 | 475.64 | 555.32 | 571.05 | 574.98 | 21 |
| <pre>SELECT *<br>FROM connections<br>WHERE from_stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)<br>AND t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02')<br>AND date <= dates_filter_max('2025-05-27T07:30+02')</pre> | 885.14 | 835.29 | 869.24 | 875.76 | 909.79 | 922.32 | 923.64 | 923.97 | 12 |
| <pre>SELECT *<br>FROM connections<br>WHERE trip_id = '262535123' -- route_id=17452_900 (M4)<br>AND date >= '2025-05-26' AND date <= '2025-06-01'</pre> | 19.31 | 15.83 | 18.02 | 18.99 | 20.27 | 22.76 | 24.78 | 27.96 | 519 |
| <pre>SELECT count(*)<br>FROM connections<br>WHERE from_stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)</pre> | 341.42 | 263.96 | 340.65 | 346.83 | 350.72 | 355.91 | 358.76 | 359.65 | 30 |
| <pre>SELECT count(*)<br>FROM connections<br>WHERE from_stop_id = 'definitely-non-existent'</pre> | 343.5 | 314.1 | 319.13 | 345.04 | 354.63 | 362.52 | 463.4 | 503.94 | 30 |
| <pre>SELECT *<br>FROM connections<br>WHERE t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= dates_filter_min('2025-05-27T07:10+02'::timestamp with time zone)<br>AND date <= dates_filter_max('2025-05-27T07:30+02'::timestamp with time zone)<br>ORDER BY t_departure<br>LIMIT 100</pre> | 1013055.35 | 986377.24 | 1026394.41 | 1009900.4 | 1026394.41 | 992028.36 | 1042228.66 | 1042888.42 | 3 |
| <pre>SELECT *<br>FROM connections<br>WHERE t_departure >= '2025-05-27T07:10+02' AND t_departure <= '2025-05-27T07:30+02'<br>AND date >= '2025-05-25' AND date <= '2025-05-27'<br>ORDER BY t_departure<br>LIMIT 100</pre> | 16347.21 | 16250.36 | 16285.17 | 16319.98 | 16395.63 | 16456.16 | 16468.27 | 16471.29 | 3 |
| <pre>SELECT *<br>FROM stats_by_route_date<br>WHERE route_id = '17452_900' -- M4<br>AND date >= '2025-05-26' AND date <= '2025-06-01'<br>AND is_effective = true</pre> | 4765.59 | 4704.49 | 4706.87 | 4709.25 | 4796.14 | 4865.64 | 4879.54 | 4883.02 | 3 |

## Related Projects

There are some projects that are very similar to `gtfs-via-duckdb`:

### gtfs-via-postgres

`gtfs-via-duckdb`'s spiritual predecessor, importing GTFS into a *PostgreSQL* database. Because `gtfs-via-duckdb` is forked from `gtfs-via-postgres`, the two have the same features, shortcomings and conceptual design (runtime access to the GTFS happens using SQL only).

However, because PostgreSQL is a daemon and because its databases are administered using SQL, `gtfs-via-postgres`' usage in production systems implies [a lot of complexity as explained in `postgis-gtfs-importer`'s readme](https://github.com/mobidata-bw/postgis-gtfs-importer/blob/v5/README.md). With DuckDB, a database is just a single file and there is no daemon, so [`duckdb-gtfs-importer`](https://github.com/OpenDataVBB/duckdb-gtfs-importer) can enable the *robustness* and *atomicity* goals with a much simpler design (>1 DB files, symlink to the latest).

Because DuckDB tends to be more efficient than PostgreSQL with the mostly [OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing)-like queries run for GTFS analysis, so `gtfs-via-duckdb` imports datasets faster and queries for common use cases usually run faster.

### Node-GTFS

[Node-GTFS (`gtfs` npm package)](https://github.com/BlinkTagInc/node-gtfs) is widely used. It covers three use cases: importing GTFS into an [SQLite](https://sqlite.org/) DB, exporting GTFS/GeoJSON from it, and generating HTML or charts for humans.

I don't use it though because

- it doesn't handle GTFS Time values correctly ([1](https://github.com/BlinkTagInc/node-gtfs/blob/master/lib/utils.js#L36-L46)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L233), checked on 2022-03-01)
- it doesn't always work in a streaming/iterative way ([1](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/export.js#L65)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/geojson-utils.js#L118-L126), checked on 2022-03-01)
- sometimes does synchronous fs calls ([1](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L65)/[2](https://github.com/BlinkTagInc/node-gtfs/blob/4d5e5369d5d94052a5004204182a2582ced8f619/lib/import.js#L298), checked on 2022-03-01)

### gtfs-sequelize

[gtfs-sequelize](https://github.com/evansiroky/gtfs-sequelize) uses [sequelize.js](https://sequelize.org) to import a GTFS feed and query the DB.

I don't use it because

- it doesn't handle GTFS Time values correctly ([1](https://github.com/evansiroky/gtfs-sequelize/blob/ba101fa82e730694c536c43e615ff38fd264a65b/lib/gtfsLoader.js#L616-L617)/[2](https://github.com/evansiroky/gtfs-sequelize/blob/ba101fa82e730694c536c43e615ff38fd264a65b/lib/gtfsLoader.js#L24-L33), cheked on 2022-03-01)
- it doesn't provide much tooling for analyzing all arrivals/departures (checked on 2022-03-01)
- some of its operations are quite slow, because they fetch related records of a record via JS instead of using `JOIN`s

### gtfs-sql-importer

There are several forks of the [original outdated project](https://github.com/cbick/gtfs_SQL_importer); [fitnr's fork](https://github.com/fitnr/gtfs-sql-importer) seems to be the most recent one.

The project has a slightly different goal than `gtfs-via-duckdb`: While `gtfs-sql-importer` is designed to import multiple versions of a GTFS dataset in an idempotent fashion, `gtfs-via-duckdb` assumes that *one* (version of a) GTFS dataset is imported into *one* DB exactly once.

`gtfs-via-duckdb` aims to provide more tools – e.g. the `arrivals_departures` & `connections` views – to help with the analysis of a GTFS dataset, whereas `gtfs-sql-importer` just imports the data.

### other related projects

- [gtfs-via-postgres](https://github.com/public-transport/gtfs-via-postgres) – `gtfs-via-duckdb`'s spiritual predecessor, importing GTFS into a PostgreSQL database.
- [gtfsdb](https://github.com/OpenTransitTools/gtfsdb) – Python library for converting GTFS files into a relational database.
- [pygtfs](https://github.com/jarondl/pygtfs) – A python (2/3) library for GTFS (fork of [gtfs-sql](https://github.com/andrewblim/gtfs-sql))
- [gtfspy](https://github.com/CxAalto/gtfspy) – Public transport network analysis using Python and SQLite.
- [GTFS Kit](https://github.com/mrcagney/gtfs_kit) – A Python 3.6+ tool kit for analyzing General Transit Feed Specification (GTFS) data.
- [GtfsToSql](https://github.com/OpenMobilityData/GtfsToSql) – Parses a GTFS feed into an SQL database (Java)
- [gtfs-to-sqlite](https://github.com/aytee17/gtfs-to-sqlite) – A tool for generating an SQLite database from a GTFS feed. (Java)
- [gtfs-lib](https://github.com/conveyal/gtfs-lib) – Java library & CLI for importing GTFS files into a PostgreSQL database.
- [gtfs-schema](https://github.com/tyleragreen/gtfs-schema) – PostgreSQL schemas for GTFS feeds. (plain SQL)
- [markusvalo/HSLtraffic](https://github.com/markusvalo/HSLtraffic) – Scripts to create a PostgreSQL database for HSL GTFS-data. (plain SQL)
- [smohiudd/gtfs-parquet-duckdb-wasm](https://github.com/smohiudd/gtfs-parquet-duckdb-wasm) – Test visualization of GTFS data using DuckDB-Wasm ([blog post](http://saadiqm.com/gtfs-parquet-duckdb-wasm/))


## License

This project is dual-licensed: **My ([@derhuerst](https://github.com/derhuerst)) contributions are licensed under the [*Prosperity Public License*](https://prosperitylicense.com), [contributions of other people](https://github.com/public-transport/gtfs-via-duckdb/graphs/contributors) are licensed as [Apache 2.0](https://apache.org/licenses/LICENSE-2.0)**.

> This license allows you to use and share this software for noncommercial purposes for free and to try this software for commercial purposes for thirty days.

> Personal use for research, experiment, and testing for the benefit of public knowledge, personal study, private entertainment, hobby projects, amateur pursuits, or religious observance, without any anticipated commercial application, doesn’t count as use for a commercial purpose.

[Get in touch with me](https://jannisr.de/) to buy a commercial license or read more about [why I sell private licenses for my projects](https://gist.github.com/derhuerst/0ef31ee82b6300d2cafd03d10dd522f7).


## Contributing

If you have a question or need support using `gtfs-via-duckdb`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/public-transport/gtfs-via-duckdb/issues).

By contributing, you agree to release your modifications under the [Apache 2.0 license](LICENSE-APACHE).
