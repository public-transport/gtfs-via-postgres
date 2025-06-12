# calculating the geographic distance of a trip's shape between two stops

1. For each stop, respectively, find the point that's closest to the stop (using `ST_LineLocatePoint()`), and then
2. measure the length between those points (using `ST_LineSubstring()` & `ST_Length()`).

```sql
WITH
	stop_a AS (
		SELECT *
		FROM stops
		WHERE stop_id = 'stop A ID'
	),
	stop_b AS (
		SELECT *
		FROM stops
		WHERE stop_id = 'stop B ID'
	)
SELECT
	ST_Length(ST_LineSubstring(
		shape::geography,
		ST_LineLocatePoint(shape::geography, stop_a.stop_loc),
		ST_LineLocatePoint(shape::geography, stop_b.stop_loc)
	)) AS segment_length
FROM stop_a, stop_b, trips
JOIN shapes_aggregated ON shapes_aggregated.shape_id = trips.shape_id
WHERE trip_id = 'some trip ID'
```
