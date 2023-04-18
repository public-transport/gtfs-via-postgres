# PostgREST integration

[PostgREST](https://postgrest.org/) is a tool that, given a PostgreSQL database (a schema within it, to be exact), creates a [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) HTTP API from it. It will also automatically generate an [OpenAPI](https://spec.openapis.org/oas/latest.html) spec for it.

`gtfs-via-postgres`'s PostgREST integration is read-only: It will create a [role](https://www.postgresql.org/docs/current/database-roles.html) `web_anon` with read-only access to the GTFS data. Due to [a bug](https://github.com/PostgREST/postgrest/issues/1870), it will also expose `POST`/`PUT`/`PATCH` operations in the OpenAPI spec, but they won't work; Only `GET`/`HEAD` (& `OPTIONS` for [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#access-control-max-age)) will work.

The `--postgrest` option will modify the generated SQL slightly, so that PostgREST can be run as-is on the database. It pairs well with the `--schema <schema>` option, so that PostgREST only exposes what's in the schema, preventing accidental leaks.
