SELECT * from bench(
'SELECT count(*)
FROM connections
WHERE from_stop_id = ''definitely-non-existent'''
);
