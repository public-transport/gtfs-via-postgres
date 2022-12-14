'use strict'

// Google's "Extended GTFS Route Types"
// https://developers.google.com/transit/gtfs/reference/extended-route-types
const googleExtendedRouteTypes = [
	['100', 'Railway Service', null],
	['101', 'High Speed Rail Service', 'TGV (FR), ICE (DE), Eurostar (GB)'],
	['102', 'Long Distance Trains', 'InterCity/EuroCity'],
	['103', 'Inter Regional Rail Service', 'InterRegio (DE), Cross County Rail (GB)'],
	['104', 'Car Transport Rail Service', null],
	['105', 'Sleeper Rail Service', 'GNER Sleeper (GB)'],
	['106', 'Regional Rail Service', 'TER (FR), Regionalzug (DE)'],
	['107', 'Tourist Railway Service', 'Romney, Hythe & Dymchurch (GB)'],
	['108', 'Rail Shuttle (Within Complex)', 'Gatwick Shuttle (GB), Sky Line (DE)'],
	['109', 'Suburban Railway', 'S-Bahn (DE), RER (FR), S-tog (Kopenhagen)'],
	['110', 'Replacement Rail Service', null],
	['111', 'Special Rail Service', null],
	['112', 'Lorry Transport Rail Service', null],
	['113', 'All Rail Services', null],
	['114', 'Cross-Country Rail Service', null],
	['115', 'Vehicle Transport Rail Service', null],
	['116', 'Rack and Pinion Railway', 'Rochers de Naye (CH), Dolderbahn (CH)'],
	['117', 'Additional Rail Service', null],
	['200', 'Coach Service', null],
	['201', 'International Coach Service', 'EuroLine, Touring'],
	['202', 'National Coach Service', 'National Express (GB)'],
	['203', 'Shuttle Coach Service', 'Roissy Bus (FR), Reading-Heathrow (GB)'],
	['204', 'Regional Coach Service', null],
	['205', 'Special Coach Service', null],
	['206', 'Sightseeing Coach Service', null],
	['207', 'Tourist Coach Service', null],
	['208', 'Commuter Coach Service', null],
	['209', 'All Coach Services', null],
	['400', 'Urban Railway Service', null],
	['401', 'Metro Service', 'Métro de Paris'],
	['402', 'Underground Service', 'London Underground, U-Bahn'],
	['403', 'Urban Railway Service', null],
	['404', 'All Urban Railway Services', null],
	['405', 'Monorail', null],
	['700', 'Bus Service', null],
	['701', 'Regional Bus Service', 'Eastbourne-Maidstone (GB)'],
	['702', 'Express Bus Service', 'X19 Wokingham-Heathrow (GB)'],
	['703', 'Stopping Bus Service', '38 London: Clapton Pond-Victoria (GB)'],
	['704', 'Local Bus Service', null],
	['705', 'Night Bus Service', 'N prefixed buses in London (GB)'],
	['706', 'Post Bus Service', 'Maidstone P4 (GB)'],
	['707', 'Special Needs Bus', null],
	['708', 'Mobility Bus Service', null],
	['709', 'Mobility Bus for Registered Disabled', null],
	['710', 'Sightseeing Bus', null],
	['711', 'Shuttle Bus', '747 Heathrow-Gatwick Airport Service (GB)'],
	['712', 'School Bus', null],
	['713', 'School and Public Service Bus', null],
	['714', 'Rail Replacement Bus Service', null],
	['715', 'Demand and Response Bus Service', null],
	['716', 'All Bus Services', null],
	['800', 'Trolleybus Service', null],
	['900', 'Tram Service', null],
	['901', 'City Tram Service', null],
	['902', 'Local Tram Service', 'Munich (DE), Brussels (BE), Croydon (GB)'],
	['903', 'Regional Tram Service', null],
	['904', 'Sightseeing Tram Service', 'Blackpool Seafront (GB)'],
	['905', 'Shuttle Tram Service', null],
	['906', 'All Tram Services', null],
	['1000', 'Water Transport Service', null],
	['1100', 'Air Service', null],
	['1200', 'Ferry Service', null],
	['1300', 'Aerial Lift Service', 'Telefèric de Montjuïc (ES), Saleve (CH), Roosevel, foot Island Tramway (US)', null],
	['1400', 'Funicular Service', 'Rigiblick (Zürich, CH)'],
	['1500', 'Taxi Service', null],
	['1501', 'Communal Taxi Service', 'Marshrutka (RU), dolmuş (TR)'],
	['1502', 'Water Taxi Service', null],
	['1503', 'Rail Taxi Service', null],
	['1504', 'Bike Taxi Service', null],
	['1505', 'Licensed Taxi Service', null],
	['1506', 'Private Hire Service Vehicle', null],
	['1507', 'All Taxi Services', null],
	['1700', 'Miscellaneous Service', null],
	['1702', 'Horse-drawn Carriage', null],
]

const routeTypesSchemes = Object.assign(Object.create(null), {
	'basic': [],
	'google-extended': googleExtendedRouteTypes,
})

// https://developers.google.com/transit/gtfs/reference#routestxt
const beforeAll = (opt) => {
	if (!(opt.routeTypesScheme in routeTypesSchemes)) {
		throw new Error(`invalid opt.routeTypesScheme, must be one of these: ${Object.keys(routeTypesSchemes).join(', ')}.`)
	}
	const extRouteTypes = routeTypesSchemes[opt.routeTypesScheme]

	return `\
CREATE TYPE "${opt.schema}".route_type_val AS ENUM (
	-- basic types
	'0' -- 0 – Tram, Streetcar, Light rail. Any light rail or street level system within a metropolitan area.
	, '1' -- 1 – Subway, Metro. Any underground rail system within a metropolitan area.
	, '2' -- 2 – Rail. Used for intercity or long-distance travel.
	, '3' -- 3 – Bus. Used for short- and long-distance bus routes.
	, '4' -- 4 – Ferry. Used for short- and long-distance boat service.
	, '5' -- 5 – Cable tram. Used for street-level rail cars where the cable runs beneath the vehicle, e.g., cable car in San Francisco.
	, '6' -- 6 – Aerial lift, suspended cable car (e.g., gondola lift, aerial tramway). Cable transport where cabins, cars, gondolas or open chairs are suspended by means of one or more cables.
	, '7' -- 7 – Funicular. Any rail system designed for steep inclines.
	, '11' -- 11 – Trolleybus. Electric buses that draw power from overhead wires using poles.
	, '12' -- 12 – Monorail. Railway in which the track consists of a single rail or a beam.

	-- extended types
${extRouteTypes.map(([route_type, desc]) => `, '${route_type}' -- ${desc}`).join('\n')}
);
-- todo [breaking]: use small table as enum? https://www.graphile.org/postgraphile/enums/#with-enum-tables
${opt.postgraphile ? `\
COMMENT ON TYPE "${opt.schema}".route_type_val IS E'@enum\\n@enumName RouteType\\n';
` : ''}

CREATE TABLE "${opt.schema}".routes (
	route_id TEXT PRIMARY KEY,
	agency_id TEXT,
	${opt.routesWithoutAgencyId ? '' : `FOREIGN KEY (agency_id) REFERENCES "${opt.schema}".agency,`}
	-- todo: Either route_short_name or route_long_name must be specified, or potentially both if appropriate.
	route_short_name TEXT,
	route_long_name TEXT,
	route_desc TEXT,
	route_type "${opt.schema}".route_type_val NOT NULL,
	route_url TEXT,
	route_color TEXT,
	route_text_color TEXT,
	route_sort_order INT
);

COPY "${opt.schema}".routes (
	route_id,
	agency_id,
	route_short_name,
	route_long_name,
	route_desc,
	route_type,
	route_url,
	route_color,
	route_text_color,
	route_sort_order
) FROM STDIN csv;
`
}

const formatRoutesRow = (r) => {
	return [
		r.route_id || null,
		r.agency_id || null,
		r.route_short_name || null,
		r.route_long_name || null,
		r.route_desc || null,
		r.route_type || null,
		r.route_url || null,
		r.route_color || null,
		r.route_text_color || null,
		r.route_sort_order ? parseInt(r.route_sort_order) : null,
	]
}

const afterAll = (opt) => `\
\\.

CREATE INDEX ON "${opt.schema}".routes (route_short_name);
${opt.postgraphile ? `\
CREATE INDEX ON "${opt.schema}".routes (agency_id);
` : ''}
`

module.exports = {
	beforeAll,
	formatRow: formatRoutesRow,
	afterAll,
}
