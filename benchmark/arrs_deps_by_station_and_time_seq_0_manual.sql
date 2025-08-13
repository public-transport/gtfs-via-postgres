SELECT *
FROM arrivals_departures
WHERE station_id = 'de:11000:900100001' -- S+U Friedrichstr. (Berlin)
AND t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'
AND date >= '2025-05-25'
AND date <= '2025-05-27'
AND stop_sequence = 0
