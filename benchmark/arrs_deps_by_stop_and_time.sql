SELECT *
FROM arrivals_departures
WHERE stop_id = 'de:11000:900100001::4' -- S+U Friedrichstr. (Berlin)
AND t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'
AND date >= dates_filter_min('2022-08-09T07:10+02')
AND date <= dates_filter_max('2022-08-09T07:30+02')
