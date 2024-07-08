SELECT *
FROM stats_by_route_date
WHERE route_id = '17452_900' -- M4
AND date >= '2022-08-08' AND date <= '2022-08-14'
AND is_effective = true
