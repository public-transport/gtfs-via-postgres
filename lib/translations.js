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

CREATE TABLE "${opt.schema}"._translations_ref_cols (
	table_name TEXT PRIMARY KEY,
	-- todo: only check if columns exist when table exists?
	record_id_col TEXT NOT NULL
		CONSTRAINT valid_record_id_col CHECK (
			"${opt.schema}".column_exists(table_name, record_id_col)
		),
	record_sub_id_col TEXT
		CONSTRAINT valid_record_sub_id_col CHECK (
			record_sub_id_col IS NULL
			OR
			"${opt.schema}".column_exists(table_name, record_sub_id_col)
		)
);
-- > ## record_id
-- > Defines the record that corresponds to the field to be translated. The value in record_id must be the first or only field of a table's primary key, as defined in the primary key attribute for each table and below:
-- > - agency_id for agency
-- > - stop_id for stops
-- > - route_id for routes
-- > - trip_id for trips
-- > - trip_id for stop_times
-- > - pathway_id for pathways
-- > - level_id for levels
-- > - attribution_id for attribution
-- > Fields in tables not defined above should not be translated. However producers sometimes add extra fields that are outside the official specification and these unofficial fields may be translated. Below is the recommended way to use record_id for those tables:
-- > - service_id for calendar
-- > - service_id for calendar_dates
-- > - fare_id for fare_attributes
-- > - fare_id for fare_rules
-- > - shape_id for shapes
-- > - trip_id for frequencies
-- > - from_stop_id for transfers
-- > ## record_sub_id
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
-- https://gtfs.org/schedule/reference/#translationstxt
INSERT INTO "${opt.schema}"._translations_ref_cols (
	table_name,
	record_id_col,
	record_sub_id_col
) VALUES
	-- todo: feed_info
	('agency', 'agency_id', NULL),
	('stops', 'stop_id', NULL),
	('routes', 'route_id', NULL),
	('trips', 'trip_id', NULL),
	('stop_times', 'trip_id', 'stop_sequence'),
	('pathways', 'pathway_id', NULL),
	('levels', 'level_id', NULL),
	('attribution', 'attribution_id', NULL),
	('calendar', 'service_id', NULL),
	('calendar_dates', 'service_id', NULL),
	('fare_attributes', 'fare_id', NULL),
	('fare_rules', 'fare_id', 'route_id'),
	('shapes', 'shape_id', NULL),
	('frequencies', 'trip_id', 'start_time'),
	('transfers', 'from_stop_id', 'to_stop_id')
;

CREATE OR REPLACE FUNCTION "${opt.schema}".row_exists(
	table_name TEXT,
	col_a_name TEXT,
	col_a_value TEXT,
	col_b_name TEXT,
	col_b_value TEXT
)
RETURNS BOOLEAN
AS $$
	DECLARE
		result BOOLEAN;
	BEGIN
		IF col_b_name IS NULL THEN
			EXECUTE format('
				SELECT EXISTS(
					SELECT *
					FROM %I.%I -- schema, table_name
					WHERE %I = %L -- col_a_name, col_a_value
					LIMIT 1
				)
			', '${opt.schema}', table_name, col_a_name, col_a_value)
			INTO STRICT result;
			RETURN result;
		ELSE
			EXECUTE format('
				SELECT EXISTS(
					SELECT *
					FROM %I.%I -- schema, table_name
					WHERE %I = %L -- col_a_name, col_a_value
					AND %I = %L -- col_b_name, col_b_value
					LIMIT 1
				)
			', '${opt.schema}', table_name, col_a_name, col_a_value, col_b_name, col_b_value)
			INTO STRICT result;
			RETURN result;
		END IF;
	END;
$$ LANGUAGE plpgsql STABLE;

-- todo: assert that row_exists works as intended
-- SELECT row_exists('stops', 'stop_id', 'de:11000:900120017::2', NULL, NULL); -- Virchowstr. (Berlin)
-- SELECT row_exists('stops', 'stop_name', 'Virchowstr. (Berlin)', NULL, NULL); -- Virchowstr. (Berlin)
-- SELECT row_exists('stops', 'stop_id', 'non-existent', NULL, NULL);
-- SELECT row_exists('stops', 'stop_name', 'non-existent', NULL, NULL);
-- SELECT row_exists('stops', 'stop_id', 'de:11000:900120017::2', 'parent_station', 'de:11000:900120017'); -- Virchowstr. (Berlin) with valid parent_station
-- SELECT row_exists('stops', 'stop_name', 'Virchowstr. (Berlin)', 'parent_station', 'de:11000:900120017'); -- Virchowstr. (Berlin) with valid parent_station
-- SELECT row_exists('stops', 'stop_id', 'de:11000:900120017::2', 'parent_station', 'non-existent'); -- Virchowstr. (Berlin) with invalid parent_station
-- SELECT row_exists('stops', 'stop_name', 'Virchowstr. (Berlin)', 'parent_station', 'non-existent'); -- Virchowstr. (Berlin) with invalid parent_station
-- SELECT row_exists('stops', 'stop_id', 'de:11000:900120017::2', 'non-existent', 'de:11000:900120017'); -- Virchowstr. (Berlin) with invalid column B, should fail
-- SELECT row_exists('stops', 'stop_name', 'Virchowstr. (Berlin)', 'non-existent', 'de:11000:900120017'); -- Virchowstr. (Berlin) with invalid column B, should fail
-- todo: assert that it fails with 2 rows

CREATE OR REPLACE FUNCTION "${opt.schema}".is_valid_translation_ref(
	_table_name TEXT,
	_field_name TEXT,
	_record_id TEXT,
	_record_sub_id TEXT,
	_field_value TEXT
)
RETURNS BOOLEAN
AS $$
	DECLARE
		_record_id_col TEXT;
		_record_sub_id_col TEXT;
		result BOOLEAN;
	BEGIN
		IF _record_id IS NOT NULL THEN
			SELECT record_id_col
			FROM "${opt.schema}"._translations_ref_cols
			WHERE table_name = _table_name
			LIMIT 1
			INTO _record_id_col;
			SELECT record_sub_id_col
			FROM "${opt.schema}"._translations_ref_cols
			WHERE table_name = _table_name
			LIMIT 1
			INTO _record_sub_id_col;

			IF _record_sub_id_col IS NULL AND _record_sub_id IS NOT NULL THEN
				RAISE EXCEPTION
				USING
					MESSAGE = format('record_sub_id must be NULL for %I but is %L', _table_name, _record_sub_id),
					ERRCODE = 'data_exception';
			END IF;
			SELECT "${opt.schema}".row_exists(
				_table_name,
				_record_id_col, _record_id,
				_record_sub_id_col, _record_sub_id
			)
			INTO STRICT result;
			RETURN result;
		ELSEIF _field_value IS NOT NULL THEN
			SELECT "${opt.schema}".row_exists(
				_table_name,
				_field_name, _field_value,
				NULL, NULL
			)
			INTO STRICT result;
			RETURN result;
		ELSE
			RAISE EXCEPTION
			USING
				MESSAGE = 'Either record_id or field_value must be NOT NULL',
				HINT = 'Refer to translations.txt the GTFS Static/Schedule reference.',
				ERRCODE = 'data_exception';
		END IF;
	END;
$$ LANGUAGE plpgsql STABLE;

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
	record_sub_id TEXT,

	-- > Instead of […] using record_id and record_sub_id, this field can be used […]. When used, the translation will be applied when the fields identified by table_name and field_name contains the exact same value defined in field_value.
	-- > The field must have exactly the value defined in field_value. If only a subset of the value matches field_value, the translation won’t be applied.
	-- > Conditionally Required:
	-- > - Forbidden if table_name is feed_info.
	-- > - Forbidden if record_id is defined.
	-- > - Required if record_id is empty.
	-- todo:
	-- > If two translation rules match the same record (one with field_value, and the other one with record_id), the rule with record_id takes precedence.
	field_value TEXT,

	CONSTRAINT field_value_or_record_id CHECK (
		field_value IS NULL OR record_id IS NULL
	),
	CONSTRAINT not_with_feed_info CHECK (
		field_value IS NULL OR table_name != 'feed_info'
	),

	CONSTRAINT valid_reference CHECK (
		table_name = 'feed_info'
		OR
		"${opt.schema}".is_valid_translation_ref(
			table_name,
			field_name,
			record_id,
			record_sub_id,
			field_value
		)
	),

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
