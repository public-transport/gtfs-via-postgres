#!/bin/bash

set -e
set -u
set -o pipefail
cd "$(dirname "$0")"

# Use a dedicated test database, never an existing feed database.
psql -X -v ON_ERROR_STOP=1 -c 'CREATE DATABASE shapes_srid'
export PGDATABASE='shapes_srid'

node <<'JS' | psql -X -v ON_ERROR_STOP=1
const shapes = require('../lib/shapes.js')
const opt = {schema: 'public', postgraphile: false}
console.log('CREATE EXTENSION postgis;')
process.stdout.write(shapes.beforeAll(opt))
// Deliberately unsorted input also checks that aggregation preserves shape order.
for (const row of [
    {shape_id: 'test', shape_pt_lon: '0.001', shape_pt_lat: '0', shape_pt_sequence: '2'},
    {shape_id: 'test', shape_pt_lon: '0', shape_pt_lat: '0', shape_pt_sequence: '1'},
]) console.log(shapes.formatRow(row).map(v => v === null ? '' : v).join(','))
console.log(shapes.afterAll(opt))
console.log(`
DO $$
DECLARE
    line geometry;
BEGIN
    SELECT shape INTO STRICT line FROM shapes_aggregated WHERE shape_id = 'test';
    IF ST_SRID(line) <> 4326 THEN
        RAISE EXCEPTION 'aggregated shape lost WGS84 SRID: %', ST_SRID(line);
    END IF;
    IF GeometryType(line) <> 'LINESTRING' OR ST_NPoints(line) <> 2
        OR ST_X(ST_StartPoint(line)) <> 0 OR ST_X(ST_EndPoint(line)) <> 0.001 THEN
        RAISE EXCEPTION 'shape type, coordinates or sequence changed';
    END IF;
    IF NOT ST_Intersects(line, ST_SetSRID(ST_Point(0, 0), 4326)) THEN
        RAISE EXCEPTION 'direct WGS84 geometry join failed';
    END IF;
END;
$$;
`)
JS
