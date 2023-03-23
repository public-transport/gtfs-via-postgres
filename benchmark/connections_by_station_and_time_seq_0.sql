SELECT * from bench(
'SELECT *
FROM connections
WHERE from_station_id = ''de:11000:900100001'' -- S+U Friedrichstr. (Berlin)
AND t_departure >= ''2022-08-09T07:10+02'' AND t_departure <= ''2022-08-09T07:30+02''
AND date >= dates_filter_min(''2022-08-09T07:10+02'')
AND date <= dates_filter_max(''2022-08-09T07:30+02'')
AND from_stop_sequence = 0',
50
);
