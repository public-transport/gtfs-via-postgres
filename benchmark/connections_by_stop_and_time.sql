SELECT * from bench(
'SELECT *
FROM connections
WHERE from_stop_id = ''de:11000:900100001::4'' -- S+U Friedrichstr. (Berlin)
AND t_departure >= ''2022-08-09T07:10+02'' AND t_departure <= ''2022-08-09T07:30+02''
AND date > ''2022-08-08'' AND date <= ''2022-08-09'''
);
