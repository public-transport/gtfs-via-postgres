// > Number of sample lines for auto detection of parameters.
// > Default: 20480
// https://duckdb.org/docs/stable/data/csv/overview
const duckdbReadCsvAutodetectionSampleSize = process.env.DUCKDB_READ_CSV_AUTODETECTION_SAMPLE_SIZE
	? parseInt(process.env.DUCKDB_READ_CSV_AUTODETECTION_SAMPLE_SIZE)
	: 20480

export {
	duckdbReadCsvAutodetectionSampleSize,
}
