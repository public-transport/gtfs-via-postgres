#!/usr/bin/env node

const {createServer} = require('http')
const {postgraphile} = require('postgraphile')
const postgisPlugin = require('@graphile/postgis').default
const simplifyInflectorPlugin = require('@graphile-contrib/pg-simplify-inflector')

const DEV = process.env.NODE_ENV === 'development'
const PROD = !DEV
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000
const SCHEMA = process.env.PGSCHEMA || 'public'

const pg = postgraphile({}, SCHEMA, {
	appendPlugins: [
		// PostGIS support for PostGraphile
		postgisPlugin,

		// Simplifies the graphile-build-pg inflector to trim the `ByFooIdAndBarId` from relations
		simplifyInflectorPlugin,
	],
	graphileBuildOptions: {
		pgSimplifyAllRows: false,
		pgShortPk: false,
	},

	pgSettings: async () => ({
		// With `timestamptz` (a.k.a. `timestamp with time zone`), PostgreSQL *doesn't* store the timezone (offset) specified on input; Instead, it always converts to UTC.
		// When querying a `timestamptz` value, it converts to the local timezone (offset) of the client's session or database server.
		// Because we loose the timezone offset information *anyways*, we configure PostGraphile to give predictable results by letting PostgreSQL always convert to UTC.
		timezone: 'UTC',
	}),

	// [Experimental] Determines if the 'Explain' feature in GraphiQL can be used to show the user the SQL statements that were executed. Set to a boolean to enable all users to use this, or to a function that filters each request to determine if the request may use Explain. DO NOT USE IN PRODUCTION unless you're comfortable with the security repurcussions of doing so.
	allowExplain: DEV,

	// Enables classic ids for Relay support. Instead of using the field name nodeId for globally unique ids, PostGraphile will instead use the field name id for its globally unique ids. This means that table id columns will also get renamed to rowId.
	classicIds: true,

	// Turns off GraphQL query logging. By default PostGraphile will log every GraphQL query it processes along with some other information. Set this to true (recommended in production) to disable that feature.
	disableQueryLog: PROD,

	// By default, JSON and JSONB fields are presented as strings (JSON encoded) from the GraphQL schema. Setting this to true (recommended) enables raw JSON input and output, saving the need to parse / stringify JSON manually.
	dynamicJson: true,

	// Set this to true to add some enhancements to GraphiQL; intended for development usage only (automatically enables with subscriptions and live).
	enhanceGraphiql: DEV,

	// Set this to true to enable the GraphiQL interface.
	graphiql: true,

	// Extends the error response with additional details from the Postgres error. Can be any combination of ['hint', 'detail', 'errcode']. Default is [].
	extendedErrors: DEV ? ['hint', 'detail', 'errcode'] : [],

	// Set false to exclude filters, orderBy, and relations that would be expensive to access due to missing indexes. Changing this from true to false is a breaking change, but false to true is not. The default is true.
	ignoreIndexes: false,

	// Set false (recommended) to exclude fields, queries and mutations that are not available to any possible user (determined from the user in connection string and any role they can become); set this option true to skip these checks and create GraphQL fields and types for everything. The default is true, in v5 the default will change to false.
	ignoreRBAC: false,

	// Some one-to-one relations were previously detected as one-to-many - should we export 'only' the old relation shapes, both new and old but mark the old ones as 'deprecated' (default), or 'omit' (recommended) the old relation shapes entirely.
	legacyRelations: 'omit',

	// If none of your RETURNS SETOF compound_type functions mix NULLs with the results then you may set this false to reduce the nullables in the GraphQL schema.
	setofFunctionsContainNulls: false,

	// Enables adding a stack field to the error response. Can be either the boolean true (which results in a single stack string) or the string json (which causes the stack to become an array with elements for each line of the stack). Recommended in development, not recommended in production.
	showErrorStack: DEV,

	// Should we use relay pagination, or simple collections?
	// "omit" (default)
	// relay connections only, "only" (not recommended)
	// simple collections only (no Relay connections), "both" - both.
	simpleCollections: 'omit',
})

const server = createServer(pg)
server.listen(PORT, (err) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}
	const {port} = server.address()
	console.info(`PostGraphile listening on port ${port}`)
})
