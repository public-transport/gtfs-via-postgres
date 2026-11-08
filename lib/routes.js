'use strict'

const DataError = require('./data-error')

// Google's "Extended GTFS Route Types"
// https://developers.google.com/transit/gtfs/reference/extended-route-types
const googleExtendedRouteTypes = [
	['100', 'Railway Service', '2', null],
	['101', 'High Speed Rail Service', '2', 'TGV (FR), ICE (DE), Eurostar (GB)'],
	['102', 'Long Distance Trains', '2', 'InterCity/EuroCity'],
	['103', 'Inter Regional Rail Service', '2', 'InterRegio (DE), Cross County Rail (GB)'],
	['104', 'Car Transport Rail Service', '2', null],
	['105', 'Sleeper Rail Service', '2', 'GNER Sleeper (GB)'],
	['106', 'Regional Rail Service', '2', 'TER (FR), Regionalzug (DE)'],
	['107', 'Tourist Railway Service', '2', 'Romney, Hythe & Dymchurch (GB)'],
	['108', 'Rail Shuttle (Within Complex)', '2', 'Gatwick Shuttle (GB), Sky Line (DE)'],
	['109', 'Suburban Railway', '2', 'S-Bahn (DE), RER (FR), S-tog (Kopenhagen)'],
	['110', 'Replacement Rail Service', '2', null],
	['111', 'Special Rail Service', '2', null],
	['112', 'Lorry Transport Rail Service', '2', null],
	['113', 'All Rail Services', '2', null],
	['114', 'Cross-Country Rail Service', '2', null],
	['115', 'Vehicle Transport Rail Service', '2', null],
	['116', 'Rack and Pinion Railway', '2', 'Rochers de Naye (CH), Dolderbahn (CH)'],
	['117', 'Additional Rail Service', '2', null],
	['200', 'Coach Service', '3', null],
	['201', 'International Coach Service', '3', 'EuroLine, Touring'],
	['202', 'National Coach Service', '3', 'National Express (GB)'],
	['203', 'Shuttle Coach Service', '3', 'Roissy Bus (FR), Reading-Heathrow (GB)'],
	['204', 'Regional Coach Service', '3', null],
	['205', 'Special Coach Service', '3', null],
	['206', 'Sightseeing Coach Service', '3', null],
	['207', 'Tourist Coach Service', '3', null],
	['208', 'Commuter Coach Service', '3', null],
	['209', 'All Coach Services', '3', null],
	['400', 'Urban Railway Service', '1', null],
	['401', 'Metro Service', '1', 'Métro de Paris'],
	['402', 'Underground Service', '1', 'London Underground, U-Bahn'],
	['403', 'Urban Railway Service', '1', null],
	['404', 'All Urban Railway Services', '1', null],
	['405', 'Monorail', '12', null],
	['700', 'Bus Service', '3', null],
	['701', 'Regional Bus Service', '3', 'Eastbourne-Maidstone (GB)'],
	['702', 'Express Bus Service', '3', 'X19 Wokingham-Heathrow (GB)'],
	['703', 'Stopping Bus Service', '3', '38 London: Clapton Pond-Victoria (GB)'],
	['704', 'Local Bus Service', '3', null],
	['705', 'Night Bus Service', '3', 'N prefixed buses in London (GB)'],
	['706', 'Post Bus Service', '3', 'Maidstone P4 (GB)'],
	['707', 'Special Needs Bus', '3', null],
	['708', 'Mobility Bus Service', '3', null],
	['709', 'Mobility Bus for Registered Disabled', '3', null],
	['710', 'Sightseeing Bus', '3', null],
	['711', 'Shuttle Bus', '3', '747 Heathrow-Gatwick Airport Service (GB)'],
	['712', 'School Bus', '3', null],
	['713', 'School and Public Service Bus', '3', null],
	['714', 'Rail Replacement Bus Service', '3', null],
	['715', 'Demand and Response Bus Service', '3', null],
	['716', 'All Bus Services', '3', null],
	['800', 'Trolleybus Service', '11', null],
	['900', 'Tram Service', '0', null],
	['901', 'City Tram Service', '0', null],
	['902', 'Local Tram Service', '0', 'Munich (DE), Brussels (BE), Croydon (GB)'],
	['903', 'Regional Tram Service', '0', null],
	['904', 'Sightseeing Tram Service', '0', 'Blackpool Seafront (GB)'],
	['905', 'Shuttle Tram Service', '0', null],
	['906', 'All Tram Services', '0', null],
	['1000', 'Water Transport Service', null, null],
	['1100', 'Air Service', null, null],
	['1200', 'Ferry Service', '4', null],
	['1300', 'Aerial Lift Service', '6', 'Telefèric de Montjuïc (ES), Saleve (CH), Roosevelt Island Tramway (US)'],
	['1301', 'Telecabin Service', '6', null],
	['1302', 'Cable Car Service', '5', null],
	['1303', 'Elevator Service', null, null],
	['1304', 'Chair Lift Service', '6', null],
	['1305', 'Drag Lift Service', '6', null],
	['1306', 'Small Telecabin Service', '6', null],
	['1307', 'All Telecabin Services', '6', null],
	['1400', 'Funicular Service', '7', 'Rigiblick (Zürich, CH)'],
	['1500', 'Taxi Service', null, null],
	['1501', 'Communal Taxi Service', null, 'Marshrutka (RU), dolmuş (TR)'],
	['1502', 'Water Taxi Service', null, null],
	['1503', 'Rail Taxi Service', null, null],
	['1504', 'Bike Taxi Service', null, null],
	['1505', 'Licensed Taxi Service', null, null],
	['1506', 'Private Hire Service Vehicle', null, null],
	['1507', 'All Taxi Services', null, null],
	['1700', 'Miscellaneous Service', null, null],
	// todo [breaking]: remove, seems like it was never part of Google's Extended Route Types
	['1701', 'Cable Car', null, null],
	['1702', 'Horse-drawn Carriage', null, null],
]

// proposed TPEG-PTI-derived route types
// https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
const tpegPtiExtendedRouteTypes = [
	['100', 'Railway Service', null],
	['101', 'High Speed Rail Service', null],
	['102', 'Long Distance Trains', null],
	['103', 'Inter Regional Rail Service', null],
	['104', 'Car Transport Rail Service', null],
	['105', 'Sleeper Rail Service', null],
	['106', 'Regional Rail Service', null],
	['107', 'Tourist Railway Service', null],
	['108', 'Rail Shuttle (Within Complex)', null],
	['109', 'Suburban Railway', null],
	['110', 'Replacement Rail Service', null],
	['111', 'Special Rail Service', null],
	['112', 'Lorry Transport Rail Service', null],
	['113', 'All Rail Services', null],
	['114', 'Cross-Country Rail Service', null],
	['115', 'Vehicle Transport Rail Service', null],
	['116', 'Rack and Pinion Railway', null],
	['117', 'Additional Rail Service', null],

	['200', 'Coach Service', null],
	['201', 'International Coach Service', null],
	['202', 'National Coach Service', null],
	['203', 'Shuttle Coach Service', null],
	['204', 'Regional Coach Service', null],
	['205', 'Special Coach Service', null],
	['206', 'Sightseeing Coach Service', null],
	['207', 'Tourist Coach Service', null],
	['208', 'Commuter Coach Service', null],
	['209', 'All Coach Services', null],

	['300', 'Suburban Railway Service', null],

	['400', 'Urban Railway Service', null],
	['401', 'Metro Service', null],
	['402', 'Underground Service', null],
	['403', 'Urban Railway Service', null],
	['404', 'All Urban Railway Services', null],

	['500', 'Metro Service', null],

	['600', 'Underground Service', null],

	['700', 'Bus Service', null],
	['701', 'Regional Bus Service', null],
	['702', 'Express Bus Service', null],
	['703', 'Stopping Bus Service', null],
	['704', 'Local Bus Service', null],
	['705', 'Night Bus Service', null],
	['706', 'Post Bus Service', null],
	['707', 'Special Needs Bus', null],
	['708', 'Mobility Bus Service', null],
	['709', 'Mobility Bus for Registered Disabled', null],
	['710', 'Sightseeing Bus', null],
	['711', 'Shuttle Bus', null],
	['712', 'School Bus', null],
	['713', 'School and Public Service Bus', null],
	['714', 'Rail Replacement Bus Service', null],
	['715', 'Demand and Response Bus Service', null],
	['716', 'All Bus Services', null],

	['800', 'Trolleybus Service', null],

	['900', 'Tram Service', null],
	['901', 'City Tram Service', null],
	['902', 'Local Tram Service', null],
	['903', 'Regional Tram Service', null],
	['904', 'Sightseeing Tram Service', null],
	['905', 'Shuttle Tram Service', null],
	['906', 'All Tram Services', null],

	['1000', 'Water Transport Service', null],
	['1001', 'International Car Ferry Service', null],
	['1002', 'National Car Ferry Service', null],
	['1003', 'Regional Car Ferry Service', null],
	['1004', 'Local Car Ferry Service', null],
	['1005', 'International Passenger Ferry Service', null],
	['1006', 'National Passenger Ferry Service', null],
	['1007', 'Regional Passenger Ferry Service', null],
	['1008', 'Local Passenger Ferry Service', null],
	['1009', 'Post Boat Service', null],
	['1010', 'Train Ferry Service', null],
	['1011', 'Road-Link Ferry Service', null],
	['1012', 'Airport-Link Ferry Service', null],
	['1013', 'Car High-Speed Ferry Service', null],
	['1014', 'Passenger High-Speed Ferry Service', null],
	['1015', 'Sightseeing Boat Service', null],
	['1016', 'School Boat', null],
	['1017', 'Cable-Drawn Boat Service', null],
	['1018', 'River Bus Service', null],
	['1019', 'Scheduled Ferry Service', null],
	['1020', 'Shuttle Ferry Service', null],
	['1021', 'All Water Transport Services', null],

	['1100', 'Air Service', null],
	['1101', 'International Air Service', null],
	['1102', 'Domestic Air Service', null],
	['1103', 'Intercontinental Air Service', null],
	['1104', 'Domestic Scheduled Air Service', null],
	['1105', 'Shuttle Air Service', null],
	['1106', 'Intercontinental Charter Air Service', null],
	['1107', 'International Charter Air Service', null],
	['1108', 'Round-Trip Charter Air Service', null],
	['1109', 'Sightseeing Air Service', null],
	['1110', 'Helicopter Air Service', null],
	['1111', 'Domestic Charter Air Service', null],
	['1112', 'Schengen-Area Air Service', null],
	['1113', 'Airship Service', null],
	['1114', 'All Air Services', null],

	['1200', 'Ferry Service', null],

	['1300', 'Telecabin Service', null],
	['1301', 'Telecabin Service', null],
	['1302', 'Cable Car Service', null],
	['1303', 'Elevator Service', null],
	['1304', 'Chair Lift Service', null],
	['1305', 'Drag Lift Service', null],
	['1306', 'Small Telecabin Service', null],
	['1307', 'All Telecabin Services', null],

	['1400', 'Funicular Service', null],
	['1401', 'Funicular Service', null],
	['1402', 'All Funicular Service', null],

	['1500', 'Taxi Service', null],
	['1501', 'Communal Taxi Service', null],
	['1502', 'Water Taxi Service', null],
	['1503', 'Rail Taxi Service', null],
	['1504', 'Bike Taxi Service', null],
	['1505', 'Licensed Taxi Service', null],
	['1506', 'Private Hire Service Vehicle', null],
	['1507', 'All Taxi Services', null],

	['1600', 'Self Drive', null],
	['1601', 'Hire Car', null],
	['1602', 'Hire Van', null],
	['1603', 'Hire Motorbike', null],
	['1604', 'Hire Cycle', null],
	['1605', 'All Self-Drive Vehicles', null],
]

// The French National Access Point (NAP) decided to use 1550 for carpooling. [1]
// [1] https://github.com/google/transit/issues/430#issuecomment-4432430607
// see also https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
const frenchCarpoolingTypes = [
	['1550', 'Carpooling', null],
]

// OTP uses 1551-1560 for carpooling [1], as an extension to the Google Extended Route Types scheme.
// Amarillo follows this by using 1551. [2]
// [1] https://github.com/opentripplanner/OpenTripPlanner/pull/4641
// [2] https://github.com/mfdz/amarillo/blob/0f10cc70c574fa413c9b30d22bcd69fa4f5f5125/amarillo/services/gtfs_constants.py#L4
// see also https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
const openTripPlannerCarpoolingTypes = [
	['1551', 'Carpooling', 'private car trips shared with others'],
	['1552', 'Carpooling', 'private car trips shared with others'],
	['1553', 'Carpooling', 'private car trips shared with others'],
	['1554', 'Carpooling', 'private car trips shared with others'],
	['1555', 'Carpooling', 'private car trips shared with others'],
	['1556', 'Carpooling', 'private car trips shared with others'],
	['1557', 'Carpooling', 'private car trips shared with others'],
	['1558', 'Carpooling', 'private car trips shared with others'],
	['1559', 'Carpooling', 'private car trips shared with others'],
	['1560', 'Carpooling', 'private car trips shared with others'],
]

const routeTypesSchemes = Object.assign(Object.create(null), {
	'basic': [],
	'google-extended': googleExtendedRouteTypes,
	'tpeg-pti': tpegPtiExtendedRouteTypes,
	'french-carpooling': frenchCarpoolingTypes,
	'otp-carpooling': openTripPlannerCarpoolingTypes,
})

// https://gtfs.org/documentation/schedule/reference/#routestxt
const beforeAll = (opt) => {
	let extRouteTypes
	if (opt.routeTypesSchemes) {
		for (let i = 0; i < opt.routeTypesSchemes.length; i++) {
			if (!(opt.routeTypesSchemes[i] in routeTypesSchemes)) {
				throw new Error(`invalid opt.routeTypesScheme[${i}], must be one of these: ${Object.keys(routeTypesSchemes).join(', ')}.`)
			}
		}
		extRouteTypes = opt.routeTypesSchemes.flatMap(scheme => routeTypesSchemes[scheme])
		// todo: assert no overlap in route_types, to get a better error message than pg's PRIMARY KEY violation?
	} else if (opt.routeTypesScheme in routeTypesSchemes) {
		extRouteTypes = routeTypesSchemes[opt.routeTypesScheme]
	} else {
		throw new Error(`invalid opt.routeTypesScheme, must be one of these: ${Object.keys(routeTypesSchemes).join(', ')}.`)
	}

	return `\
-- todo: change this to be a table, add extended -> basic mapping
CREATE TYPE "${opt.schema}".route_type_val AS ENUM (
	-- basic types
	'0' -- 0 – Tram, Streetcar, Light rail. Any light rail or street level system within a metropolitan area.
	, '1' -- 1 – Subway, Metro. Any underground rail system within a metropolitan area.
	, '2' -- 2 – Rail. Used for intercity or long-distance travel.
	, '3' -- 3 – Bus. Used for short- and long-distance bus routes.
	, '4' -- 4 – Ferry. Used for short- and long-distance boat service.
	, '5' -- 5 – Cable tram. Used for street-level rail cars where the cable runs beneath the vehicle, e.g., cable car in San Francisco.
	, '6' -- 6 – Aerial lift, suspended cable car (e.g., gondola lift, aerial tramway). Cable transport where cabins, cars, gondolas or open chairs are suspended by means of one or more cables.
	, '7' -- 7 – Funicular. Any rail system designed for steep inclines.
	, '11' -- 11 – Trolleybus. Electric buses that draw power from overhead wires using poles.
	, '12' -- 12 – Monorail. Railway in which the track consists of a single rail or a beam.

	-- extended types
${extRouteTypes.map(([route_type, desc]) => `, '${route_type}' -- ${desc}`).join('\n')}
);
CREATE CAST ("${opt.schema}".route_type_val AS text) WITH INOUT AS IMPLICIT;
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

const formatRoutesRow = (r, opt, workingState) => {
	const agency_id = r.agency_id || null
	if (agency_id === null && !opt.routesWithoutAgencyId) {
		// The GTFS spec allows routes.agency_id to be empty/null if there is exactly one agency in the feed.
		// It seems that GTFS has allowed this at least since 2016:
		// https://github.com/google/transit/blame/217e9bf/gtfs/spec/en/reference.md#L544-L554
		if (workingState.nrOfRowsByName.get('agency') !== 1) {
			// todo: throw special error indicating an error in the input data
			throw new DataError(
				'routes',
				'agency_id must not be empty/null',
				[
					'The GTFS spec allows routes.agency_id to be empty/null only if there is exactly one agency in the feed.'
				],
			)
		}
	}

	return [
		r.route_id || null,
		agency_id,
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
