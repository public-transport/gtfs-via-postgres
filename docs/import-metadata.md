# import metadata

If you run `gtfs-to-sql` with the `--import-metadata` option, it will create functions providing information about the imported feed as well as the import process.

An example with the [2023-04-05 VBB GTFS feed](https://vbb-gtfs.jannisr.de/2023-04-05):

```sql
SELECT gtfs_data_imported_at()
-- 2023-04-13 22:24:14.781+02

SELECT gtfs_via_postgres_version()
-- 4.5.3

SELECT gtfs_via_postgres_options()
-- {"schema": "public", "silent": false, "importStart": 1681417454781, "importMetadata": true, … }
SELECT (gtfs_via_postgres_options())['tripsWithoutShapeId']
-- true
```