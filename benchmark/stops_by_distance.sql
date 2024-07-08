SELECT *
FROM stops
ORDER BY ST_Distance(stop_loc::geometry, ST_SetSRID(ST_MakePoint(9.7, 50.547), 4326)) ASC
LIMIT 100
