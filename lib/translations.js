'use strict'

const {strictEqual} = require('assert')
const RUN = require('./run.js')
const {queryNumberOfRows} = require('./rows-count.js')

// > ## record_id
// > Defines the record that corresponds to the field to be translated. The value in record_id must be the first or only field of a table's primary key, as defined in the primary key attribute for each table and below:
// > - agency_id for agency
// > - stop_id for stops
// > - route_id for routes
// > - trip_id for trips
// > - trip_id for stop_times
// > - pathway_id for pathways
// > - level_id for levels
// > - attribution_id for attribution
// > Fields in tables not defined above should not be translated. However producers sometimes add extra fields that are outside the official specification and these unofficial fields may be translated. Below is the recommended way to use record_id for those tables:
// > - service_id for calendar
// > - service_id for calendar_dates
// > - fare_id for fare_attributes
// > - fare_id for fare_rules
// > - shape_id for shapes
// > - trip_id for frequencies
// > - from_stop_id for transfers
// > ## record_sub_id
// > Helps the record that contains the field to be translated when the table doesn’t have a unique ID. Therefore, the value in record_sub_id is the secondary ID of the table, as defined by the table below:
// > - None for agency.txt
// > - None for stops.txt
// > - None for routes.txt
// > - None for trips.txt
// > - stop_sequence for stop_times.txt
// > - None for pathways.txt
// > - None for levels.txt
// > - None for attributions.txt
// > Fields in tables not defined above should not be translated. However producers sometimes add extra fields that are outside the official specification and these unofficial fields may be translated. Below is the recommended way to use record_sub_id for those tables:
// > - None for calendar.txt
// > - date for calendar_dates.txt
// > - None for fare_attributes.txt
// > - route_id for fare_rules.txt
// > - None for shapes.txt
// > - start_time for frequencies.txt
// > - to_stop_id for transfers.txt
// https://gtfs.org/documentation/schedule/reference/#translationstxt
const supportedTranslationRefs = new Map([
	['agency', {
		src_table_name: 'agency',
		record_id_column: 'agency_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['stops', {
		src_table_name: 'stops',
		record_id_column: 'stop_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['routes', {
		src_table_name: 'routes',
		record_id_column: 'route_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['trips', {
		src_table_name: 'trips',
		record_id_column: 'trip_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['stop_times', {
		src_table_name: 'stop_times',
		record_id_column: 'trip_id',
		record_sub_id_column: 'stop_sequence', record_sub_id_column_type: 'INTEGER',
	}],
	['pathways', {
		src_table_name: 'pathways',
		record_id_column: 'pathway_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['levels', {
		src_table_name: 'levels',
		record_id_column: 'level_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	// todo: attribution.txt is not supported yet
	// ['attribution', {
	// 	src_table_name: 'attribution',
	// 	record_id_column: 'attribution_id',
	// 	record_sub_id_column: null, record_sub_id_column_type: null,
	// }],
	['calendar', {
		src_table_name: 'calendar',
		record_id_column: 'service_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	['calendar_dates', {
		src_table_name: 'calendar_dates',
		record_id_column: 'service_id',
		record_sub_id_column: 'date', record_sub_id_column_type: 'DATE',
	}],
	// todo: fare_attributes.txt & fare_rules.txt are not supported yet
	// ['fare_attributes', {
	// 	src_table_name: 'fare_attributes',
	// 	record_id_column: 'fare_id',
	// 	record_sub_id_column: null, record_sub_id_column_type: null,
	// }],
	// ['fare_rules', {
	// 	src_table_name: 'fare_rules',
	// 	record_id_column: 'fare_id',
	// 	record_sub_id_column: 'route_id', record_sub_id_column_type: 'TEXT',
	// }],
	['shapes', {
		src_table_name: 'shapes',
		record_id_column: 'shape_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
	// frequencies.txt has no primary key and/or unique index yet because DuckDB doesn't support indexes on INTERVAL. See frequencies.js for more details.
	// ['frequencies', {
	// 	src_table_name: 'frequencies',
	// 	record_id_column: 'trip_id',
	// 	record_sub_id_column: 'start_time', record_sub_id_column_type: 'INTERVAL',
	// }],
	// transfers' rows are *not* unique on (from_stop_id, to_stop_id), so we cannot create a foreign key reference on the table.
	// todo: find a workaround
	// ['transfers', {
	// 	src_table_name: 'transfers',
	// 	record_id_column: 'from_stop_id',
	// 	record_sub_id_column: 'to_stop_id', record_sub_id_column_type: 'TEXT',
	// }],
	['feed_info', {
		src_table_name: 'feed_info',
		record_id_column: null,
		record_sub_id_column: null, record_sub_id_column_type: null,
	}],
])

const _srcTableRefSql = (table_name) => {
	return `_translations_${table_name}`
}

const _srcTablesSql = (pathToTranslations, table_name, translationRef) => {
	const {
		record_id_column,
		record_sub_id_column, record_sub_id_column_type,
	} = translationRef

	const hasCol = record_id_column !== null
	const colRef = hasCol ? `"${record_id_column}"` : null
	const hasSubCol = record_sub_id_column !== null
	const subColRef = hasSubCol ? `"${record_sub_id_column}"` : null
	const srcTableRef = _srcTableRefSql(table_name)

		return `\
CREATE TABLE ${srcTableRef} (
	${hasCol ? `record_id TEXT NOT NULL,` : ``}
	${hasSubCol ? `record_sub_id ${record_sub_id_column_type} NOT NULL,` : ``}
${hasCol ? `\
		FOREIGN KEY (
			record_id
			${hasSubCol ? `, record_sub_id` : ``}
		)
		REFERENCES ${table_name} (
			${colRef}
			${hasSubCol ? `, ${subColRef}` : ``}
		),\
` : ``}
	field_name TEXT NOT NULL, -- todo: validate via all_columns helper view
	language TEXT NOT NULL, -- todo: validate just like agency.agency_lang
	translation TEXT NOT NULL
);

INSERT INTO ${srcTableRef}
SELECT
	${hasCol ? `record_id,` : ``}
	${hasSubCol ? `record_sub_id,` : ``}
	field_name,
	language,
	translation
FROM read_csv(
	'${pathToTranslations}',
	header = true,
	all_varchar = true
)
WHERE table_name = '${table_name}'
-- todo: support field_value-based translations
AND field_value IS NULL;
`
}
strictEqual(
	_srcTablesSql('foo/trans.txt', 'feed_info', {
		record_id_column: null,
		record_sub_id_column: null, record_sub_id_column_type: null,
	}),
	`\
CREATE TABLE _translations_feed_info (
	
	

	field_name TEXT NOT NULL, -- todo: validate via all_columns helper view
	language TEXT NOT NULL, -- todo: validate just like agency.agency_lang
	translation TEXT NOT NULL
);

INSERT INTO _translations_feed_info
SELECT
	
	
	field_name,
	language,
	translation
FROM read_csv(
	'foo/trans.txt',
	header = true,
	all_varchar = true
)
WHERE table_name = 'feed_info'
-- todo: support field_value-based translations
AND field_value IS NULL;
`,
	'_srcTablesSql with feed_info.txt',
)
strictEqual(
	_srcTablesSql('foo/trans.txt', 'calendar_dates', {
		record_id_column: 'service_id',
		record_sub_id_column: 'date', record_sub_id_column_type: 'DATE',
	}),
	`\
CREATE TABLE _translations_calendar_dates (
	record_id TEXT NOT NULL,
	record_sub_id DATE NOT NULL,
		FOREIGN KEY (
			record_id
			, record_sub_id
		)
		REFERENCES calendar_dates (
			"service_id"
			, "date"
		),
	field_name TEXT NOT NULL, -- todo: validate via all_columns helper view
	language TEXT NOT NULL, -- todo: validate just like agency.agency_lang
	translation TEXT NOT NULL
);

INSERT INTO _translations_calendar_dates
SELECT
	record_id,
	record_sub_id,
	field_name,
	language,
	translation
FROM read_csv(
	'foo/trans.txt',
	header = true,
	all_varchar = true
)
WHERE table_name = 'calendar_dates'
-- todo: support field_value-based translations
AND field_value IS NULL;
`,
	'_srcTablesSql with calendar_dates.txt',
)

const _selectToBeMergedSql = (table_name, translationRef) => {
	const {
		record_id_column,
		record_sub_id_column,
	} = translationRef

	const hasCol = record_id_column !== null
	const hasSubCol = record_sub_id_column !== null
	const srcTableRef = _srcTableRefSql(table_name)

		return `\
	SELECT
		'${table_name}' AS table_name,
		-- Some UNION-ed tables have non-TEXT record_id/record_sub_id columns (e.g. INTEGER).
		-- Given that UNION ALL does implicit casts to match the *first* table, we force TEXT here so that we do not depend on their order.
		${hasCol ? `record_id::TEXT as record_id,` : ``}
		${hasSubCol ? `record_sub_id::TEXT as record_sub_id,` : ``}
		*
		${hasCol ? `EXCLUDE (
			record_id
			${hasSubCol ? `, record_sub_id` : ``}
		)` : ``}
	FROM ${srcTableRef}
`
}
strictEqual(
	_selectToBeMergedSql('agency', {
		record_id_column: 'agency_id',
		record_sub_id_column: null, record_sub_id_column_type: null,
	}),
	`\
	SELECT
		'agency' AS table_name,
		-- Some UNION-ed tables have non-TEXT record_id/record_sub_id columns (e.g. INTEGER).
		-- Given that UNION ALL does implicit casts to match the *first* table, we force TEXT here so that we do not depend on their order.
		record_id::TEXT as record_id,
		
		*
		EXCLUDE (
			record_id
			
		)
	FROM _translations_agency
`,
	'_selectToBeMergedSql with agency.txt',
)
strictEqual(
	_selectToBeMergedSql('calendar_dates', {
		record_id_column: 'service_id',
		record_sub_id_column: 'date', record_sub_id_column_type: 'DATE',
	}),
	`\
	SELECT
		'calendar_dates' AS table_name,
		-- Some UNION-ed tables have non-TEXT record_id/record_sub_id columns (e.g. INTEGER).
		-- Given that UNION ALL does implicit casts to match the *first* table, we force TEXT here so that we do not depend on their order.
		record_id::TEXT as record_id,
		record_sub_id::TEXT as record_sub_id,
		*
		EXCLUDE (
			record_id
			, record_sub_id
		)
	FROM _translations_calendar_dates
`,
	'_selectToBeMergedSql with calendar_dates.txt',
)

const _translatedSql = (table_name, translatedCols) => {
	const _transRefSql = (col) => `"trans_${col}"`

	const _sqls = Array.from(translatedCols.entries())
	.map(([col, translationRef]) => {
		const {
			src_table_name,
			record_id_column,
			record_sub_id_column,
		} = translationRef

		const hasCol = record_id_column !== null
		const colRef = hasCol ? `"${record_id_column}"` : null
		const hasSubCol = record_sub_id_column !== null
		const subColRef = hasSubCol ? `"${record_sub_id_column}"` : null
		const srcTableRef = _srcTableRefSql(src_table_name)
		const transRef = _transRefSql(col)

		return {
			colLangSelect: `\
	${transRef}.language AS "${col}_lang",`,
			colReplace: `\
		coalesce(${transRef}.translation, "${col}") AS "${col}"`,
			transJoin: `\
LEFT JOIN ${srcTableRef} ${transRef} ON (
	${transRef}.field_name = '${col}'
	${hasCol ? `AND data.${colRef} = ${transRef}.record_id` : ``}
	${hasSubCol ? `AND data.${subColRef} = ${transRef}.record_sub_id` : ``}
)`,
		}
	})

	return `\
CREATE VIEW ${table_name}_translated AS
SELECT
	-- todo: fall back to feed_info.feed_lang?
${_sqls.map(sql => sql.colLangSelect).join('\n')}
	data.*
	REPLACE (
${_sqls.map(sql => sql.colReplace).join(',\n')}
	)
FROM ${table_name} data
${_sqls.map(sql => sql.transJoin).join('\n')};
`
}
{
	const agencyRef = supportedTranslationRefs.get('agency')
	strictEqual(
		_translatedSql('agency', new Map([
			['agency_name', agencyRef],
			['agency_url', agencyRef],
		])),
		`\
CREATE VIEW agency_translated AS
SELECT
	-- todo: fall back to feed_info.feed_lang?
	"trans_agency_name".language AS "agency_name_lang",
	"trans_agency_url".language AS "agency_url_lang",
	data.*
	REPLACE (
		coalesce("trans_agency_name".translation, "agency_name") AS "agency_name",
		coalesce("trans_agency_url".translation, "agency_url") AS "agency_url"
	)
FROM agency data
LEFT JOIN _translations_agency "trans_agency_name" ON (
	"trans_agency_name".field_name = 'agency_name'
	AND data."agency_id" = "trans_agency_name".record_id
	
)
LEFT JOIN _translations_agency "trans_agency_url" ON (
	"trans_agency_url".field_name = 'agency_url'
	AND data."agency_id" = "trans_agency_url".record_id
	
);
`,
		'_translatedSql with agency.txt',
	)
}
{
	const calendarDatesRef = supportedTranslationRefs.get('calendar_dates')
	strictEqual(
		_translatedSql('calendar_dates', new Map([
			['foo', calendarDatesRef],
			['b-a-r', calendarDatesRef],
		])),
		`\
CREATE VIEW calendar_dates_translated AS
SELECT
	-- todo: fall back to feed_info.feed_lang?
	"trans_foo".language AS "foo_lang",
	"trans_b-a-r".language AS "b-a-r_lang",
	data.*
	REPLACE (
		coalesce("trans_foo".translation, "foo") AS "foo",
		coalesce("trans_b-a-r".translation, "b-a-r") AS "b-a-r"
	)
FROM calendar_dates data
LEFT JOIN _translations_calendar_dates "trans_foo" ON (
	"trans_foo".field_name = 'foo'
	AND data."service_id" = "trans_foo".record_id
	AND data."date" = "trans_foo".record_sub_id
)
LEFT JOIN _translations_calendar_dates "trans_b-a-r" ON (
	"trans_b-a-r".field_name = 'b-a-r'
	AND data."service_id" = "trans_b-a-r".record_id
	AND data."date" = "trans_b-a-r".record_sub_id
);
`,
		'_translatedSql with calendar_dates.txt',
	)
}
{
	const feedInfoRef = supportedTranslationRefs.get('feed_info')
	strictEqual(
		_translatedSql('feed_info', new Map([
			['foo', {
				...feedInfoRef,
				src_table_name: 'some-other-table',
			}],
			['b-a-r', feedInfoRef],
		])),
		`\
CREATE VIEW feed_info_translated AS
SELECT
	-- todo: fall back to feed_info.feed_lang?
	"trans_foo".language AS "foo_lang",
	"trans_b-a-r".language AS "b-a-r_lang",
	data.*
	REPLACE (
		coalesce("trans_foo".translation, "foo") AS "foo",
		coalesce("trans_b-a-r".translation, "b-a-r") AS "b-a-r"
	)
FROM feed_info data
LEFT JOIN _translations_some-other-table "trans_foo" ON (
	"trans_foo".field_name = 'foo'
	
	
)
LEFT JOIN _translations_feed_info "trans_b-a-r" ON (
	"trans_b-a-r".field_name = 'b-a-r'
	
	
);
`,
		'_translatedSql with feed_info.txt',
	)
}

// https://gtfs.org/documentation/schedule/reference/#translationstxt
const importData = async (db, pathToTranslations, opt, workingState) => {
	const translationRefs = new Map(
		supportedTranslationRefs.entries()
		// If there is no such file/table, don't allow translations for it.
		.filter(([table_name]) => opt.files.includes(table_name))
	)

	const selectsToBeMerged = []
	for (const [table_name, translationRef] of translationRefs.entries()) {
		await db[RUN](_srcTablesSql(pathToTranslations, table_name, translationRef))
		selectsToBeMerged.push(_selectToBeMergedSql(table_name, translationRef))
	}

	await db[RUN](`\
-- The MobilityData GTFS Validator just uses Java's Locale#toLanguageTag() to validate "language".
-- https://github.com/MobilityData/gtfs-validator/blob/a11b7489902dd54dc194af1f1515583406ba3716/main/src/main/java/org/mobilitydata/gtfsvalidator/table/GtfsTranslationSchema.java#L36
-- https://docs.oracle.com/javase/7/docs/api/java/util/Locale.html
-- related: https://github.com/google/transit/pull/98

-- We mimick a true table with a view that UNIONs all individual _translations_* tables.
CREATE VIEW translations AS
${selectsToBeMerged.map(sql => `(${sql})`).join(`UNION ALL BY NAME`)};
`)

	const agencyRef = supportedTranslationRefs.get('agency')
	const stopsRef = supportedTranslationRefs.get('stops')
	const routesRef = supportedTranslationRefs.get('routes')
	const tripsRef = supportedTranslationRefs.get('trips')
	const stopTimesRef = supportedTranslationRefs.get('stop_times')
	const pathwaysRef = supportedTranslationRefs.get('pathways')
	const levelsRef = supportedTranslationRefs.get('levels')
	const feedInfoRef = supportedTranslationRefs.get('feed_info')
	const preTranslatedColumns = new Map([
		['agency', new Map([
			['agency_name', agencyRef],
			['agency_url', agencyRef],
			['agency_phone', agencyRef],
			['agency_fare_url', agencyRef],
			['agency_email', agencyRef],
		])],
		['stops', new Map([
			['stop_code', stopsRef],
			['stop_name', stopsRef],
			// todo: not supported yet by stops.js
			// ['tts_stop_name', stopsRef],
			['stop_desc', stopsRef],
			['stop_url', stopsRef],
			['platform_code', stopsRef],
		])],
		['routes', new Map([
			['route_short_name', routesRef],
			['route_long_name', routesRef],
			['route_desc', routesRef],
			['route_url', routesRef],
		])],
		['trips', new Map([
			['trip_headsign', tripsRef],
			['trip_short_name', tripsRef],
			// todo: not supported yet by trips.js
			// ['trip_desc', tripsRef],
			// ['trip_url', tripsRef],
		])],
		['stop_times', new Map([
			['stop_headsign', stopTimesRef],
		])],
		// todo: fare_attributes.txt & fare_rules.txt are not supported yet
		// todo: frequencies.txt (see above)
		// todo: areas.txt is not supported yet
		// todo: networks.txt is not supported yet
		['pathways', new Map([
			['signposted_as', pathwaysRef],
			['reversed_signposted_as', pathwaysRef],
		])],
		['levels', new Map([
			['level_name', levelsRef],
		])],
		// todo: location_groups.txt is not supported yet
		// todo: booking_rules.txt is not supported yet
		['feed_info', new Map([
			['feed_publisher_name', feedInfoRef],
			['feed_publisher_url', feedInfoRef],
			['feed_version', feedInfoRef],
			['feed_contact_email', feedInfoRef],
			['feed_contact_url', feedInfoRef],
		])],
		// todo: attribution.txt is not supported yet

	])
	for (const [table_name, translatedCols] of preTranslatedColumns) {
		if (!opt.files.includes(table_name)) {
			// If there is no such file/table, don't allow translations for it.
			continue
		}

		await db[RUN](_translatedSql(table_name, translatedCols))
	}

	// *_translated for tables/views made up by gtfs-via-duckdb
	{
		await db[RUN](_translatedSql('arrivals_departures', new Map([
			['route_short_name', routesRef],
			['route_long_name', routesRef],
			['trip_headsign', tripsRef],
			['stop_headsign', stopsRef],
			['stop_name', stopsRef],
			// todo: ['station_name', stopsRef],
		])))
	}
	// todo: connections

// 	`\
// -- CREATE OR REPLACE VIEW arrivals_departures_translated AS
// -- SELECT
// -- 	-- almost all columns, duh
// -- 	-- todo: find a way to use all columns without explicitly enumerating them here
// -- 	route_id,
// -- 	coalesce(route_s_t.translation, route_short_name) as route_short_name,
// -- 	route_s_t.language as route_short_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	coalesce(route_l_t.translation, route_long_name) as route_long_name,
// -- 	route_l_t.language as route_long_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	route_type,
// -- 	trip_id, direction_id,
// -- 	coalesce(trip_t.translation, trip_headsign) as trip_headsign,
// -- 	trip_t.language as trip_headsign_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	service_id,
// -- 	shape_id,
// -- 	"date",
// -- 	stop_sequence,
// -- 	coalesce(stop_times_t.translation, stop_headsign) as stop_headsign,
// -- 	stop_times_t.language as stop_headsign_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	pickup_type, drop_off_type, shape_dist_traveled, timepoint,
// -- 	tz,
// -- 	arrival_time, t_arrival,
// -- 	departure_time, t_departure,
// -- 	stop_id,
// -- 	coalesce(stop_t.translation, stop_name) as stop_name,
// -- 	stop_t.language as stop_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	station_id,
// -- 	coalesce(station_t.translation, station_name) as station_name,
// -- 	station_t.language as station_name_lang -- todo: fall back to feed_info.feed_lang?
// -- FROM arrivals_departures ad
// -- LEFT JOIN translations route_s_t ON (
// -- 	route_s_t.table_name = 'routes' AND route_s_t.field_name = 'route_short_name'
// -- 	AND (ad.route_id = route_s_t.record_id OR ad.route_short_name = route_s_t.field_value)
// -- )
// -- LEFT JOIN translations route_l_t ON (
// -- 	route_l_t.table_name = 'routes' AND route_l_t.field_name = 'route_long_name'
// -- 	AND (ad.route_id = route_l_t.record_id OR ad.route_long_name = route_l_t.field_value)
// -- )
// -- LEFT JOIN translations trip_t ON (
// -- 	trip_t.table_name = 'trips' AND trip_t.field_name = 'trip_headsign'
// -- 	AND (ad.trip_id = trip_t.record_id OR ad.trip_headsign = trip_t.field_value)
// -- )
// -- LEFT JOIN translations stop_t ON (
// -- 	stop_t.table_name = 'stops' AND stop_t.field_name = 'stop_name'
// -- 	AND (ad.stop_id = stop_t.record_id OR ad.stop_name = stop_t.field_value)
// -- )
// -- LEFT JOIN translations station_t ON (
// -- 	station_t.table_name = 'stops' AND station_t.field_name = 'stop_name'
// -- 	AND station_t.language = stop_t.language
// -- 	AND (ad.station_id = station_t.record_id OR ad.station_name = station_t.field_value)
// -- )
// -- LEFT JOIN translations stop_times_t ON (
// -- 	stop_times_t.table_name = 'stop_times' AND stop_times_t.field_name = 'stop_headsign'
// -- 	AND (
// -- 		(ad.trip_id = stop_times_t.record_id AND ad.stop_sequence = stop_times_t.record_sub_id::integer)
// -- 		OR ad.stop_headsign = stop_times_t.field_value
// -- 	)
// -- );
// -- 
// -- CREATE OR REPLACE VIEW connections_translated AS
// -- SELECT
// -- 	-- almost all columns, duh
// -- 	-- todo: find a way to use all columns without explicitly enumerating them here
// -- 	route_id,
// -- 	coalesce(route_s_t.translation, route_short_name) as route_short_name,
// -- 	route_s_t.language as route_short_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	coalesce(route_l_t.translation, route_long_name) as route_long_name,
// -- 	route_l_t.language as route_long_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	route_type,
// -- 	trip_id,
// -- 	service_id,
// -- 	direction_id,
// -- 	coalesce(trip_t.translation, trip_headsign) as trip_headsign,
// -- 	trip_t.language as trip_headsign_lang, -- todo: fall back to feed_info.feed_lang?
// -- 
// -- 	from_stop_id,
// -- 	coalesce(from_stop.translation, from_stop_name) as from_stop_name,
// -- 	from_stop.language as from_stop_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	from_station_id,
// -- 	coalesce(from_station.translation, from_station_name) as from_station_name,
// -- 	from_station.language as from_station_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 
// -- 	coalesce(from_stop_times_t.translation, from_stop_headsign) as from_stop_headsign,
// -- 	from_stop_times_t.language as from_stop_headsign_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	from_pickup_type,
// -- 	t_departure,
// -- 	departure_time, -- todo [breaking]: this is misleading, remove it
// -- 	from_stop_sequence,
// -- 	from_timepoint,
// -- 
// -- 	"date",
// -- 
// -- 	to_timepoint,
// -- 	to_stop_sequence,
// -- 	t_arrival,
// -- 	arrival_time, -- todo [breaking]: this is misleading, remove it
// -- 	to_drop_off_type,
// -- 	coalesce(to_stop_times_t.translation, to_stop_headsign) as to_stop_headsign,
// -- 	to_stop_times_t.language as to_stop_headsign_lang, -- todo: fall back to feed_info.feed_lang?
// -- 
// -- 	to_stop_id,
// -- 	coalesce(to_stop.translation, to_stop_name) as to_stop_name,
// -- 	to_stop.language as to_stop_name_lang, -- todo: fall back to feed_info.feed_lang?
// -- 	to_station_id,
// -- 	coalesce(to_station.translation, to_station_name) as to_station_name,
// -- 	to_station.language as to_station_name_lang -- todo: fall back to feed_info.feed_lang?
// -- FROM connections c
// -- LEFT JOIN translations route_s_t ON (
// -- 	route_s_t.table_name = 'routes' AND route_s_t.field_name = 'route_short_name'
// -- 	AND (c.route_id = route_s_t.record_id OR c.route_short_name = route_s_t.field_value)
// -- )
// -- LEFT JOIN translations route_l_t ON (
// -- 	route_l_t.table_name = 'routes' AND route_l_t.field_name = 'route_long_name'
// -- 	AND (c.route_id = route_l_t.record_id OR c.route_long_name = route_l_t.field_value)
// -- )
// -- LEFT JOIN translations trip_t ON (
// -- 	trip_t.table_name = 'trips' AND trip_t.field_name = 'trip_headsign'
// -- 	AND (c.trip_id = trip_t.record_id OR c.trip_headsign = trip_t.field_value)
// -- )
// -- LEFT JOIN translations from_stop ON (
// -- 	from_stop.table_name = 'stops' AND from_stop.field_name = 'stop_name'
// -- 	AND (c.from_stop_id = from_stop.record_id OR c.from_stop_name = from_stop.field_value)
// -- )
// -- LEFT JOIN translations from_station ON (
// -- 	from_station.table_name = 'stops' AND from_station.field_name = 'stop_name'
// -- 	AND from_station.language = from_stop.language
// -- 	AND (c.from_station_id = from_station.record_id OR c.from_station_name = from_station.field_value)
// -- )
// -- LEFT JOIN translations to_stop ON (
// -- 	to_stop.table_name = 'stops' AND to_stop.field_name = 'stop_name'
// -- 	AND to_stop.language = from_stop.language
// -- 	AND (c.to_stop_id = to_stop.record_id OR c.to_stop_name = to_stop.field_value)
// -- )
// -- LEFT JOIN translations to_station ON (
// -- 	to_station.table_name = 'stops' AND to_station.field_name = 'stop_name'
// -- 	AND to_station.language = from_stop.language
// -- 	AND (c.to_station_id = to_station.record_id OR c.to_station_name = to_station.field_value)
// -- )
// -- LEFT JOIN translations from_stop_times_t ON (
// -- 	from_stop_times_t.table_name = 'stop_times' AND from_stop_times_t.field_name = 'stop_headsign'
// -- 	AND (
// -- 		(c.trip_id = from_stop_times_t.record_id AND c.from_stop_sequence = from_stop_times_t.record_sub_id::integer)
// -- 		OR c.from_stop_headsign = from_stop_times_t.field_value
// -- 	)
// -- )
// -- LEFT JOIN translations to_stop_times_t ON (
// -- 	to_stop_times_t.table_name = 'stop_times' AND to_stop_times_t.field_name = 'stop_headsign'
// -- 	AND (
// -- 		(c.trip_id = to_stop_times_t.record_id AND c.to_stop_sequence = to_stop_times_t.record_sub_id::integer)
// -- 		OR c.to_stop_headsign = to_stop_times_t.field_value
// -- 	)
// -- );
// `;

	workingState.nrOfRowsByName.set('translations', await queryNumberOfRows(db, 'translations', opt))
}

module.exports = importData
