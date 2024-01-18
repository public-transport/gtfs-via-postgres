# importing multiple datasets into one DB

Using `gtfs-via-postgres`, you can import more than one dataset into a single PostgreSQL database by importing them into separate [schemas](https://www.postgresql.org/docs/14/ddl-schemas.html). You can then run queries combine or compare data from them.

As an example, let's import two datasets ([Paris](https://en.wikipedia.org/wiki/Île-de-France_Mobilités)' and [Berlin](https://en.wikipedia.org/wiki/Verkehrsverbund_Berlin-Brandenburg)'s) into separate schemas:

```shell
wget -U 'gtfs-via-postgres demo' -O paris.gtfs.zip 'https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip'
unzip -d paris.gtfs paris.gtfs.zip
gtfs-to-sql --require-dependencies \
	--schema paris -- paris.gtfs/*.txt \
	| sponge | psql -b

wget -U 'gtfs-via-postgres demo' -O berlin.gtfs.zip 'https://www.vbb.de/vbbgtfs'
unzip -d berlin.gtfs berlin.gtfs.zip
gtfs-to-sql --require-dependencies \
	--schema berlin -- berlin.gtfs/*.txt \
	| sponge | psql -b
```

We can now do queries across both datasets, for example finding the geographically furthest 2 stops:

```sql
-- warning: takes a long time to compute!
SELECT
	paris.stop_id AS paris_stop_id,
	berlin.stop_id AS berlin_stop_id
FROM
	paris.stops paris,
	berlin.stops berlin
ORDER BY paris.stop_loc <-> berlin.stop_loc DESC
LIMIT 100
```
