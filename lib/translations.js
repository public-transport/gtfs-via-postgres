'use strict'

// https://developers.google.com/transit/gtfs/reference#agencytxt
const beforeAll = (opt) => `\
CREATE OR REPLACE FUNCTION "${opt.schema}".table_exists(
	t_name TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT FROM pg_tables
		WHERE schemaname = '${opt.schema}'
		AND tablename = t_name
		LIMIT 1
	);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION "${opt.schema}".column_exists(
	t_name TEXT,
	c_name TEXT
)
RETURNS BOOLEAN
AS $$
	SELECT EXISTS (
		SELECT FROM information_schema.columns
		WHERE table_schema = '${opt.schema}'
		AND table_name = t_name
		AND column_name = c_name
		LIMIT 1
	);
$$ LANGUAGE sql STABLE;

-- The MobilityData GTFS Validator just uses Java's Locale#toLanguageTag() to validate "language".
-- https://github.com/MobilityData/gtfs-validator/blob/a11b7489902dd54dc194af1f1515583406ba3716/main/src/main/java/org/mobilitydata/gtfsvalidator/table/GtfsTranslationSchema.java#L36
-- https://docs.oracle.com/javase/7/docs/api/java/util/Locale.html
-- related: https://github.com/google/transit/pull/98

-- https://gtfs.org/schedule/reference/#translationstxt
CREATE TABLE "${opt.schema}".translations (
	-- > Defines the table that contains the field to be translated. Allowed values are:
	-- > agency, stops, routes, trips, stop_times, pathways, levels, feed_info, attributions
	-- > Any file added to GTFS will have a table_name value equivalent to the file name, as listed above (i.e., not including the .txt file extension).
	-- todo: use an enum? spec is ambiguous if it allows any table
	table_name TEXT NOT NULL
		CONSTRAINT valid_table_name CHECK (
			"${opt.schema}".table_exists(table_name)
		),

	-- > Name of the field to be translated. […] Fields with other types should not be translated.
	field_name TEXT NOT NULL
		CONSTRAINT valid_field_name CHECK (
			"${opt.schema}".column_exists(table_name, field_name)
		),

	language TEXT NOT NULL
		CONSTRAINT valid_language CHECK (
			"${opt.schema}".is_bcp_47_code(language)
		),

	translation TEXT NOT NULL,

	-- > Defines the record that corresponds to the field to be translated. The value in record_id must be the first or only field of a table's primary key, as defined in the primary key attribute for each table and below […].
	-- > Fields in tables not defined above should not be translated. However producers sometimes add extra fields that are outside the official specification and these unofficial fields may be translated. […]
	-- > Conditionally Required:
	-- > - Forbidden if table_name is feed_info.
	-- > - Forbidden if field_value is defined.
	-- > - Required if field_value is empty.
	record_id TEXT,

	-- > Helps the record that contains the field to be translated when the table doesn’t have a unique ID. Therefore, the value in record_sub_id is the secondary ID of the table, as defined by the table below:
	-- > - None for agency.txt
	-- > - None for stops.txt
	-- > - None for routes.txt
	-- > - None for trips.txt
	-- > - stop_sequence for stop_times.txt
	-- > - None for pathways.txt
	-- > - None for levels.txt
	-- > - None for attributions.txt
	-- > Fields in tables not defined above should not be translated. However producers sometimes add extra fields that are outside the official specification and these unofficial fields may be translated. Below is the recommended way to use record_sub_id for those tables:
	-- > - None for calendar.txt
	-- > - date for calendar_dates.txt
	-- > - None for fare_attributes.txt
	-- > - route_id for fare_rules.txt
	-- > - None for shapes.txt
	-- > - start_time for frequencies.txt
	-- > - to_stop_id for transfers.txt
	-- > Conditionally Required:
	-- > - Forbidden if table_name is feed_info.
	-- > - Forbidden if field_value is defined.
	-- > - Required if table_name=stop_times and record_id is defined.
	record_sub_id TEXT, -- todo: validate

	-- > Instead of […] using record_id and record_sub_id, this field can be used […]. When used, the translation will be applied when the fields identified by table_name and field_name contains the exact same value defined in field_value.
	-- > The field must have exactly the value defined in field_value. If only a subset of the value matches field_value, the translation won’t be applied.
	-- > Conditionally Required:
	-- > - Forbidden if table_name is feed_info.
	-- > - Forbidden if record_id is defined.
	-- > - Required if record_id is empty.
	-- todo:
	-- > If two translation rules match the same record (one with field_value, and the other one with record_id), the rule with record_id takes precedence.
	field_value TEXT, -- todo: validate

	CONSTRAINT field_value_or_record_id CHECK (
		field_value IS NULL OR record_id IS NULL
	),
	CONSTRAINT not_with_feed_info CHECK (
		field_value IS NULL OR table_name != 'feed_info'
	),

	-- todo: check if valid reference

	-- > Primary key (table_name, field_name, language, record_id, record_sub_id, field_value)
	-- https://gtfs.org/schedule/reference/#translationstxt
	-- PostgreSQL doesn't allow NULL values for primary key columns, so we use UNIQUE.
	UNIQUE (
		table_name,
		field_name,
		language,
		record_id,
		record_sub_id,
		field_value
	)
);

COPY "${opt.schema}".translations (
	table_name,
	field_name,
	language,
	translation,
	record_id,
	record_sub_id,
	field_value
) FROM STDIN csv;
`

const formatTranslationsRow = (t) => {
	return [
		t.table_name || null,
		t.field_name || null,
		t.language || null,
		t.translation || null,
		t.record_id || null,
		t.record_sub_id || null,
		t.field_value || null,
	]
}

const afterAll = `\
\\.
`

module.exports = {
	beforeAll,
	formatRow: formatTranslationsRow,
	afterAll,
}
