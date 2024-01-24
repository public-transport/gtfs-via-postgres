'use strict'

const debug = require('debug')('gtfs-via-postgres')
const {randomBytes} = require('crypto')
const sequencify = require('sequencify')
const {inspect} = require('util')
const readCsv = require('gtfs-utils/read-csv')
const {Stringifier} = require('csv-stringify')
const formatters = require('./lib')
const getDependencies = require('./lib/deps')
const pkg = require('./package.json')

const convertGtfsToSql = async function* (files, opt = {}) {
	opt = {
		silent: false,
		requireDependencies: false,
		ignoreUnsupportedFiles: false,
		routeTypesScheme: 'google-extended',
		tripsWithoutShapeId: !files.some(f => f.name === 'shapes'),
		routesWithoutAgencyId: false,
		stopsWithoutLevelId: !files.some(f => f.name === 'levels'),
		stopsLocationIndex: false,
		lowerCaseLanguageCodes: false,
		statsByRouteIdAndDate: 'none',
		statsByAgencyIdAndRouteIdAndStopAndHour: 'none',
		statsActiveTripsByHour: 'none',
		schema: 'public',
		postgraphile: false,
		postgraphilePassword: process.env.POSTGRAPHILE_PGPASSWORD || null,
		postgrest: false,
		postgrestPassword: process.env.POSTGREST_PASSWORD || null,
		importMetadata: false,
		...opt,
	}
	debug('opt', opt)
	const {
		silent,
		tripsWithoutShapeId,
		requireDependencies,
		ignoreUnsupportedFiles,
		importMetadata,
		statsByRouteIdAndDate,
		statsByAgencyIdAndRouteIdAndStopAndHour,
		statsActiveTripsByHour,
	} = opt
	let postgraphilePassword = opt.postgraphilePassword
	if (opt.postgraphile && postgraphilePassword === null) {
		postgraphilePassword = randomBytes(10).toString('hex')
		console.error(`PostGraphile PostgreSQL user's password:`, postgraphilePassword)
	}
	let postgrestPassword = opt.postgrestPassword
	if (opt.postgrest && postgrestPassword === null) {
		postgrestPassword = randomBytes(10).toString('hex')
		console.error(`PostrREST PostgreSQL user's password:`, postgrestPassword)
	}

	if (ignoreUnsupportedFiles) {
		files = files.filter(f => !!formatters[f.name])
	}
	debug('files', files)

	const fileNames = files.map(f => f.name)
	const deps = getDependencies(opt, fileNames)
	debug('deps', deps)

	const tasks = { // file name -> [dep name]
		'is_valid_lang_code': {
			dep: [],
		},
		'is_timezone': {
			dep: [],
		},
		...(tripsWithoutShapeId ? {} : {
			'shape_exists': {
				dep: [...deps.shape_exists],
			},
		}),

		// special handling of calendar/calendar_dates:
		// service_days relies on *both* calendar's & calendar_dates' tables to
		// be present, so we add mock tasks here. Each of these mock tasks get
		// replaced by a file-based one below if the file has been passed.
		'calendar': {
			dep: [],
		},
		'calendar_dates': {
			dep: [],
		},
		'service_days': {
			dep: ['calendar', 'calendar_dates'],
		},

		// The arrivals_departures & connections views rely on frequencies' table
		// to be present, so we add a mock task here. It gets replaced by a
		// file-based one below if the file has been passed.
		'frequencies': {
			dep: [...deps.frequencies],
		},

		...(importMetadata ? {
			'import_metadata': {
				dep: [],
			},
		} : {}),

		...(statsByRouteIdAndDate !== 'none' ? {
			'stats_by_route_date': {
				dep: ['stop_times'],
			},
		} : {}),
		...(statsByAgencyIdAndRouteIdAndStopAndHour !== 'none' ? {
			'stats_by_agency_route_stop_hour': {
				dep: ['stop_times'],
			},
		} : {}),
		...(statsActiveTripsByHour !== 'none' ? {
			'stats_active_trips_by_hour': {
				dep: ['stop_times'],
			},
		} : {}),
	}

	for (const file of files) {
		if (!formatters[file.name]) {
			throw new Error('invalid/unsupported file: ' + file.name)
		}

		const dependencies = deps[file.name] || []
		for (const dep of dependencies) {
			if (requireDependencies && !tasks[dep] && !fileNames.includes(dep)) {
				const err = new Error(`${file.name} depends on ${dep}`)
				err.code = 'MISSING_GTFS_DEPENDENCY'
				throw err
			}
		}

		tasks[file.name] = {
			file: file.file,
			dep: Array.from(dependencies),
		}
	}
	debug('tasks', tasks)

	const order = []
	sequencify(tasks, Object.keys(tasks), order)
	debug('order', order)

	opt.importStart = Date.now()

	yield `\
-- GTFS SQL dump generated by ${pkg.name} v${pkg.version}
-- ${pkg.homepage}
-- options:
${inspect(opt, {compact: false}).split('\n').map(line => '-- ' + line).join('\n')}

\\set ON_ERROR_STOP on
CREATE EXTENSION IF NOT EXISTS postgis;
${opt.schema !== 'public' ? `CREATE SCHEMA IF NOT EXISTS "${opt.schema}";` : ''}
BEGIN;

-- gtfs-via-postgres supports importing >1 GTFS datasets into 1 DB, each dataset within its own schema. See https://github.com/public-transport/gtfs-via-postgres/issues/51 for more information.
-- Because almost all helper utilities (enums, functions, etc.) are schema-specific, they get imported more than once. In order to prevent subtle bugs due to incompatibilities among two schemas imported by different gtfs-via-postgres versions, we mock a "mutex" here by checking for public.gtfs_via_postgres_import_version()'s return value.

-- todo: this can be done more elegantly: just a "DO" block, "ASSERT" that the version matches, create gtfs_via_postgres_import_version() in the "EXCEPTION" block
CREATE FUNCTION pg_temp.get_gtfs_via_postgres_import_version()
RETURNS TEXT
AS $$
	DECLARE
		res TEXT;
	BEGIN
		SELECT public.gtfs_via_postgres_import_version() INTO res;
		RETURN res;
	EXCEPTION
		WHEN undefined_function THEN
			-- do nothing, silence error
			RETURN NULL;
	END;
$$
LANGUAGE plpgsql;

DO $$
BEGIN
	IF EXISTS (
		SELECT version
		FROM (
			SELECT pg_temp.get_gtfs_via_postgres_import_version() AS version
		) t
		WHERE version != '${pkg.version}'
	) THEN
		RAISE EXCEPTION 'existing GTFS data imported with an incompatible version of gtfs-via-postgres';
	END IF;
END
$$
LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.gtfs_via_postgres_import_version()
RETURNS TEXT
AS $$
	SELECT '${pkg.version}'
$$
LANGUAGE sql;

\n`

	const csv = new Stringifier({quoted: true})
	const nrOfRowsByName = new Map()
	const workingState = {
		nrOfRowsByName,
	}

	for (const name of order) {
		if (!silent) console.error(name)
		const task = tasks[name]
		yield `-- ${name}\n-----------------\n\n`

		const {
			beforeAll,
			afterAll,
		} = formatters[name]

		if ('string' === typeof beforeAll && beforeAll) {
			yield beforeAll
		} else if ('function' === typeof beforeAll) {
			yield beforeAll(opt)
		}

		if (task.file) {
			const {formatRow} = formatters[name]
			let nrOfRows = 0
			for await (const rawRow of await readCsv(task.file)) {
				const row = formatRow(rawRow, opt, workingState)
				let formattedRow = null
				csv.api.__transform(row, (_formattedRow) => {
					formattedRow = _formattedRow
				})
				yield formattedRow
				nrOfRows++
			}

			nrOfRowsByName.set(name, nrOfRows)
			// todo [breaking]: indent with \t
			// todo [breaking]: print a summary of all files instead
			if (!silent) console.error(`  processed ${nrOfRows} rows`)
		}

		if ('string' === typeof afterAll && afterAll) {
			yield afterAll + ';\n'
		} else if ('function' === typeof afterAll) {
			yield afterAll(opt) + ';\n'
		}
	}

	yield `\

${opt.postgraphile ? `\
-- seal imported data
-- todo:
-- > Be careful with public schema.It already has a lot of default privileges that you maybe don't want... See documentation[1].
-- > [1]: postgresql.org/docs/11/ddl-schemas.html#DDL-SCHEMAS-PRIV
DO $$
BEGIN
	-- https://stackoverflow.com/questions/8092086/create-postgresql-role-user-if-it-doesnt-exist#8099557
	IF EXISTS (
		SELECT FROM pg_catalog.pg_roles
		WHERE rolname = 'postgraphile'
	) THEN
		RAISE NOTICE 'Role "postgraphile" already exists, skipping creation.';
	ELSE
		CREATE ROLE postgraphile LOGIN PASSWORD '${opt.postgraphilePassword}'; -- todo: escape properly
	END IF;
END
$$;
DO $$
    DECLARE
        db TEXT := current_database();
    BEGIN
    	-- todo: grant just on $opt.schema instead?
        EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', db, 'postgraphile');
    END
$$;
GRANT USAGE ON SCHEMA "${opt.schema}" TO postgraphile;
-- https://stackoverflow.com/questions/760210/how-do-you-create-a-read-only-user-in-postgresql#comment50679407_762649
REVOKE CREATE ON SCHEMA "${opt.schema}" FROM PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA "${opt.schema}" TO postgraphile;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA "${opt.schema}" GRANT SELECT ON TABLES TO postgraphile;
-- todo: set search_path? https://stackoverflow.com/questions/760210/how-do-you-create-a-read-only-user-in-postgresql#comment33535263_762649
` : ''}

${opt.postgrest ? `\
${opt.schema !== 'public' ? `\
-- pattern from https://stackoverflow.com/a/8099557
DO
$$
BEGIN
	-- Roles are shared across databases, so we have remove previously configured privileges.
	-- This might of course interfere with other programs running on the DBMS!
	-- todo: find a cleaner solution
	IF EXISTS (
		SELECT FROM pg_catalog.pg_roles
		WHERE  rolname = 'web_anon'
	) THEN
		RAISE WARNING 'Role web_anon already exists. Reassigning owned DB objects to current_user().';
		REASSIGN OWNED BY web_anon TO SESSION_USER;
		-- REVOKE ALL PRIVILEGES ON DATABASE current_database() FROM web_anon;
		-- REVOKE ALL PRIVILEGES ON SCHEMA "${opt.schema}" FROM web_anon;
		-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${opt.schema}" FROM web_anon;
		-- REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${opt.schema}" FROM web_anon;
	ELSE
		BEGIN
			CREATE ROLE web_anon NOLOGIN NOINHERIT;
		EXCEPTION
			WHEN duplicate_object THEN
				RAISE NOTICE 'Role web_anon was just created by a concurrent transaction.';
		END;
	END IF;
	IF EXISTS (
		SELECT FROM pg_catalog.pg_roles
		WHERE  rolname = 'postgrest'
	) THEN
		RAISE WARNING 'Role postgrest already exists. Reassigning owned DB objects to current_user().';
		REASSIGN OWNED BY postgrest TO SESSION_USER;
		-- REVOKE ALL PRIVILEGES ON DATABASE current_database() FROM postgrest;
		-- REVOKE ALL PRIVILEGES ON SCHEMA "${opt.schema}" FROM postgrest;
		-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${opt.schema}" FROM postgrest;
		-- REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${opt.schema}" FROM postgrest;
	ELSE
		BEGIN
			CREATE ROLE postgrest LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOSUPERUSER PASSWORD '${postgrestPassword}';
		EXCEPTION
			WHEN duplicate_object THEN
				RAISE NOTICE 'Role postgrest was just created by a concurrent transaction.';
		END;
	END IF;
END
$$;


-- https://postgrest.org/en/stable/tutorials/tut0.html#step-4-create-database-for-api
-- https://postgrest.org/en/stable/explanations/db_authz.html
-- todo: is this secure?
GRANT USAGE ON SCHEMA "${opt.schema}" TO web_anon;
GRANT SELECT ON ALL TABLES IN SCHEMA "${opt.schema}" TO web_anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "${opt.schema}" TO web_anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "${opt.schema}" TO web_anon;

GRANT web_anon TO postgrest;

COMMENT ON SCHEMA "${opt.schema}" IS
$$GTFS REST API
This REST API is created by running [PostgREST](https://postgrest.org/) on top of a [PostgreSQL](https://www.postgresql.org) DB generated using [gtfs-via-postgres](https://github.com/public-transport/gtfs-via-postgres).
$$;
` : ''}
` : ''}

COMMIT;`
}

module.exports = convertGtfsToSql
