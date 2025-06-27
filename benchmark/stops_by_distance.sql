SELECT *
FROM stops
ORDER BY ST_Distance(stop_loc::geometry, ST_Point(9.7, 50.547)) ASC
LIMIT 100
