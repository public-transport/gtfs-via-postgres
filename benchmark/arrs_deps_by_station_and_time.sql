SELECT * from bench(
'SELECT *
FROM arrivals_departures
WHERE station_id = ''de:11000:900100001'' -- S+U Friedrichstr. (Berlin)
AND t_departure >= ''2022-08-09T07:10+02'' AND t_departure <= ''2022-08-09T07:30+02''
AND date > ''2022-08-08'' AND date <= ''2022-08-09''',
40
);
