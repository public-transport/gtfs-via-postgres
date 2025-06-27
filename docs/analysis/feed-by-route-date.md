# analysing a GTFS dataset by route ID and/or date

Are you trying to answer a question like those below?

- Are there certain dates or days of the week that have sigificantly less arrivals/departures (hereinafter "stop time events")? – This *may* indicate errors in the data, e.g. a faulty `calendar.csv` or `calendar_dates.csv` file.
- Has the number of stop time events decreased, compared to the last dataset version?
- Do specific routes stop running during certain time periods?

`gtfs-via-duckdb` optionally provides a **(materialized) view `stats_by_route_date` to help with such SQL queries. Use the `--stats-by-route-date` flag to enable it** in the generated SQL:

- If you run `gtfs-to-sql` with `--stats-by-route-date=view`, `stats_by_route_date` will be a "regular" non-materialized view. Use this option if you want to import the GTFS data quickly, and if you only query `stats_by_route_date` rarely or in time-uncritical scenarios.
- If you pass `--stats-by-route-date=materialized-view`, the `stats_by_route_date` view will [be materialized](https://www.postgresql.org/docs/14/rules-materializedviews.html). Use this option if you need fast queries, and if you can tolerate significantly longer import times (3m for the 64mb 2023-03-05 SNCB/NMBS GTFS feed, 1h15m for the 540mb 2023-02-27 VBB GTFS feed).

`stats_by_route_date` has the following columns:

- `route_id`
- `date`
- `dow` – day of the week, following the [PostgreSQL notation `0` (Sunday) to `6` (Saturday)](https://www.postgresql.org/docs/14/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT)
- `nr_of_trips` – nr of trips starting on that date
- `nr_of_arrs_deps` – nr of trips taking place on that date
- `is_effective` – wether `nr_of_trips` & `nr_of_arrs_deps` are calculated based on the *effective* date (i.e. the date that the stop time event actually happens on) or *schedule* date (i.e. the date which their `stop_time` rows refer to)

So

- if you want to take a customer-facing perspective on the data (as in "I don't care which trips are scheduled before midnight, I want to know if they run today"), filter for `is_effective = True` rows;
- If you're interested in the operational/planning perspective (e.g. if you're looking for data errors), filter for `is_effective = False` rows.

## example: nr of effective stop time events of a single route over a week

```sql
-- using VBB's 2023-02-27 GTFS data
SELECT *
FROM stats_by_route_date stats
WHERE is_effective = True
AND route_id = '17438_900', -- M1 tram line
AND "date" >= '2023-03-19' -- Sunday, dow = 0
AND "date" <= '2023-03-25' -- Saturday, dow = 6
ORDER BY route_id, "date", is_effective DESC
```

```csv
route_id,date,dow,nr_of_trips,nr_of_arrs_deps,is_effective,dow
17438_900,2023-03-19,0,258,5870,t,0
17438_900,2023-03-20,1,345,7831,t,1
17438_900,2023-03-21,2,345,7831,t,2
17438_900,2023-03-22,3,345,7831,t,3
17438_900,2023-03-23,4,345,7831,t,4
17438_900,2023-03-24,5,345,7831,t,5
17438_900,2023-03-25,6,326,9001,t,6
```
