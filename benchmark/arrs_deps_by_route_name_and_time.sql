SELECT *
FROM arrivals_departures
WHERE route_short_name = 'S1'
AND t_departure >= '2025-05-27T07:10:00+02' AND t_departure <= '2025-05-27T07:30:00+02'
AND date >= dates_filter_min('2025-05-27T07:10:00+02'::timestamp with time zone)
AND date <= dates_filter_max('2025-05-27T07:30:00+02'::timestamp with time zone)
