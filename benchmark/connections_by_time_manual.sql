SELECT *
FROM connections
WHERE t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'
AND date >= '2025-05-25' AND date <= '2025-05-27'
ORDER BY t_departure
LIMIT 100
