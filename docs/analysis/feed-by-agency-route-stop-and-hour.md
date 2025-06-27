# analysing a GTFS dataset by route ID, stop ID and/or hour

With the `--stats-by-route-and-stop-and-hour` option, `gtfs-via-duckdb` provides a view `stats_by_agency_route_stop_hour`. Just like [`stats_by_route_id_and_date`](feed-by-route-and-date.md), it aggregates all arrivals by `agency_id`, `route_id`, `stop_id` and `effective_hour`.

Note: As a materialized view, `stats_by_agency_route_stop_hour` takes up a significant amount of space, e.g. 13GB with the 2023-05-02 VBB GTFS feed.
