# analysing the no. of active trips

Do you want to know how many trips are running at a specific point in time?

`gtfs-via-duckdb` optionally provides a **(materialized) view `stats_active_trips_by_hour` to answer this. Use the `--stats-active-trips-by-hour` flag to enable it**:

- If you run `gtfs-to-duckdb` with `--stats-active-trips-by-hour=view`, `stats_active_trips_by_hour` will be a "regular" non-materialized view. Use this option if you want to import the GTFS data quickly, and if you only query `stats_active_trips_by_hour` rarely or in time-uncritical scenarios.
- If you pass `--stats-active-trips-by-hour=materialized-view`, the `stats_active_trips_by_hour` view will [be materialized](https://www.postgresql.org/docs/14/rules-materializedviews.html). Use this option if you need fast queries, and if you can tolerate significantly longer import times (a minute for small feeds, many hours for large feeds).

## example: number of active trips over the course of a day

```sql
-- using VBB's 2023-05-02 GTFS data
SELECT *
FROM stats_active_trips_by_hour stats
WHERE "hour" >= '2023-05-20T22:00+02:00'
AND "hour" <= '2023-05-21T08:00+02:00'
```

`hour` | `nr_of_active_trips`
-|-
`2023-05-20T22:00+02:00` | `2715`
`2023-05-20T23:00+02:00` | `2401`
`2023-05-21T00:00+02:00` | `1827`
`2023-05-21T01:00+02:00` | `974`
`2023-05-21T02:00+02:00` | `813`
`2023-05-21T03:00+02:00` | `818`
`2023-05-21T04:00+02:00` | `887`
`2023-05-21T05:00+02:00` | `1118`
`2023-05-21T06:00+02:00` | `1598`
`2023-05-21T07:00+02:00` | `2318`
`2023-05-21T08:00+02:00` | `2615`

## example: custom temporal resolution

As an example, let's query active trips *per minute* by just adapting `stats_active_trips_by_hour`'s underlying query:

```sql
WITH all_minutes AS NOT MATERIALIZED (
	SELECT feed_time_series('minute') AS "minute"
)
SELECT DISTINCT ON ("minute")
	"minute",
	count(*) OVER (PARTITION BY "minute") as nr_of_active_trips
FROM (
	-- only keep one arrival/departure per trip
	SELECT DISTINCT ON ("minute", route_id, trip_id)
		*
	FROM (
		SELECT *
		FROM all_minutes
		LEFT JOIN connections ON (
			date_trunc('minute', t_departure) <= "minute"
			AND date_trunc('minute', t_arrival) >= "minute"	
		)
	) t
) cons
WHERE "minute" >= '2023-05-20T22:00+02:00'
AND "minute" < '2023-05-20T22:15+02:00'
```

`minute` | `nr_of_active_trips`
-|-
`2023-05-20T22:00+02:00` | `959`
`2023-05-20T22:01+02:00` | `960`
`2023-05-20T22:02+02:00` | `966`
`2023-05-20T22:03+02:00` | `978`
`2023-05-20T22:04+02:00` | `976`
`2023-05-20T22:05+02:00` | `982`
`2023-05-20T22:06+02:00` | `991`
`2023-05-20T22:07+02:00` | `980`
`2023-05-20T22:08+02:00` | `975`
`2023-05-20T22:09+02:00` | `967`
`2023-05-20T22:10+02:00` | `983`
`2023-05-20T22:11+02:00` | `976`
`2023-05-20T22:12+02:00` | `982`
`2023-05-20T22:13+02:00` | `970`
`2023-05-20T22:14+02:00` | `958`
