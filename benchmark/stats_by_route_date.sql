SELECT *
FROM stats_by_route_date
WHERE route_id = '17452_900' -- M4
AND date >= '2025-05-26' AND date <= '2025-06-01'
AND is_effective = true
