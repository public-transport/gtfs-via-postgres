# analysing the no. of active trips

Do you want to know how many trips are running at a specific point in time?

`gtfs-via-postgres` optionally provides a **(materialized) view `stats_active_trips_by_hour` to answer this. Use the `--stats-active-trips-by-hour` flag to enable it**:

- If you run `gtfs-to-sql` with `--stats-active-trips-by-hour=view`, `stats_active_trips_by_hour` will be a "regular" non-materialized view. Use this option if you want to import the GTFS data quickly, and if you only query `stats_active_trips_by_hour` rarely or in time-uncritical scenarios.
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
