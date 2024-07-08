SELECT *
FROM arrivals_departures
WHERE t_departure >= '2022-08-09T07:10+02' AND t_departure <= '2022-08-09T07:30+02'
AND date >= '2022-08-08'
AND date <= '2022-08-09'
