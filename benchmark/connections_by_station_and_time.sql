SELECT *
FROM connections
WHERE from_station_id = 'de:11000:900194006' -- S Schöneweide/Sterndamm (Berlin)
AND t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'
AND date >= dates_filter_min('2025-05-27T07:10:00+02')
AND date <= dates_filter_max('2025-05-27T07:30:00+02')
