# working with multiple datasets

Using [DuckDB's ability to attach databases to one session](https://duckdb.org/docs/stable/sql/statements/attach), you can run queries combining or comparing data from multiple GTFS datasets.

As an example, let's compare two datasets from [Paris](https://en.wikipedia.org/wiki/Île-de-France_Mobilités) and [Berlin](https://en.wikipedia.org/wiki/Verkehrsverbund_Berlin-Brandenburg).

First, we import each into its own database:

```shell
wget -U 'gtfs-via-duckdb demo' -O paris.gtfs.zip 'https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip'
unzip -d paris.gtfs paris.gtfs.zip
gtfs-to-duckdb --require-dependencies \
	paris.gtfs.duckdb \
	paris.gtfs/*.txt

wget -U 'gtfs-via-duckdb demo' -O berlin.gtfs.zip 'https://www.vbb.de/vbbgtfs'
unzip -d berlin.gtfs berlin.gtfs.zip
gtfs-to-duckdb --require-dependencies \
	berlin.gtfs.duckdb \
	berlin.gtfs/*.txt
```

In a new DuckDB shell/session, we can now do queries across both datasets, for example finding the geographically furthest 2 stops:

```sql
ATTACH 'paris.gtfs.duckdb' AS paris;
ATTACH 'berlin.gtfs.duckdb' AS berlin;

-- warning: takes a long time to compute!
SELECT
	paris.stop_id AS paris_stop_id,
	berlin.stop_id AS berlin_stop_id
FROM
	paris.stops paris,
	berlin.stops berlin
-- todo: does this operator work in DuckDB?
ORDER BY paris.stop_loc <-> berlin.stop_loc DESC
LIMIT 100
```
