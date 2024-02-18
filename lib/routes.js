'use strict'

const DataError = require('./data-error')

// Google's "Extended GTFS Route Types"
// https://developers.google.com/transit/gtfs/reference/extended-route-types
const googleExtendedRouteTypes = [
	[ '100',  '2', 'Railway Service', null],
	[ '101',  '2', 'High Speed Rail Service', 'TGV (FR), ICE (DE), Eurostar (GB)'],
	[ '102',  '2', 'Long Distance Trains', 'InterCity/EuroCity'],
	[ '103',  '2', 'Inter Regional Rail Service', 'InterRegio (DE), Cross County Rail (GB)'],
	[ '104',  '2', 'Car Transport Rail Service', null],
	[ '105',  '2', 'Sleeper Rail Service', 'GNER Sleeper (GB)'],
	[ '106',  '2', 'Regional Rail Service', 'TER (FR), Regionalzug (DE)'],
	[ '107',  '2', 'Tourist Railway Service', 'Romney, Hythe & Dymchurch (GB)'],
	[ '108',  '2', 'Rail Shuttle (Within Complex)', 'Gatwick Shuttle (GB), Sky Line (DE)'],
	[ '109',  '2', 'Suburban Railway', 'S-Bahn (DE), RER (FR), S-tog (Kopenhagen)'],
	[ '110',  '2', 'Replacement Rail Service', null],
	[ '111',  '2', 'Special Rail Service', null],
	[ '112',  '2', 'Lorry Transport Rail Service', null],
	[ '113',  '2', 'All Rail Services', null],
	[ '114',  '2', 'Cross-Country Rail Service', null],
	[ '115',  '2', 'Vehicle Transport Rail Service', null],
	[ '116',  '2', 'Rack and Pinion Railway', 'Rochers de Naye (CH), Dolderbahn (CH)'],
	[ '117',  '2', 'Additional Rail Service', null],
	[ '200',  '3', 'Coach Service', null],
	[ '201',  '3', 'International Coach Service', 'EuroLine, Touring'],
	[ '202',  '3', 'National Coach Service', 'National Express (GB)'],
	[ '203',  '3', 'Shuttle Coach Service', 'Roissy Bus (FR), Reading-Heathrow (GB)'],
	[ '204',  '3', 'Regional Coach Service', null],
	[ '205',  '3', 'Special Coach Service', null],
	[ '206',  '3', 'Sightseeing Coach Service', null],
	[ '207',  '3', 'Tourist Coach Service', null],
	[ '208',  '3', 'Commuter Coach Service', null],
	[ '209',  '3', 'All Coach Services', null],
	[ '400',  '0', 'Urban Railway Service', null],
	[ '401',  '0', 'Metro Service', 'Métro de Paris'],
	[ '402',  '0', 'Underground Service', 'London Underground, U-Bahn'],
	[ '403',  '0', 'Urban Railway Service', null],
	[ '404',  '0', 'All Urban Railway Services', null],
	[ '405', '12', 'Monorail', null],
	[ '700',  '3', 'Bus Service', null],
	[ '701',  '3', 'Regional Bus Service', 'Eastbourne-Maidstone (GB)'],
	[ '702',  '3', 'Express Bus Service', 'X19 Wokingham-Heathrow (GB)'],
	[ '703',  '3', 'Stopping Bus Service', '38 London: Clapton Pond-Victoria (GB)'],
	[ '704',  '3', 'Local Bus Service', null],
	[ '705',  '3', 'Night Bus Service', 'N prefixed buses in London (GB)'],
	[ '706',  '3', 'Post Bus Service', 'Maidstone P4 (GB)'],
	[ '707',  '3', 'Special Needs Bus', null],
	[ '708',  '3', 'Mobility Bus Service', null],
	[ '709',  '3', 'Mobility Bus for Registered Disabled', null],
	[ '710',  '3', 'Sightseeing Bus', null],
	[ '711',  '3', 'Shuttle Bus', '747 Heathrow-Gatwick Airport Service (GB)'],
	[ '712',  '3', 'School Bus', null],
	[ '713',  '3', 'School and Public Service Bus', null],
	[ '714',  '3', 'Rail Replacement Bus Service', null],
	[ '715',  '3', 'Demand and Response Bus Service', null],
	[ '716',  '3', 'All Bus Services', null],
	[ '800', '11', 'Trolleybus Service', null],
	[ '900',  '0', 'Tram Service', null],
	[ '901',  '0', 'City Tram Service', null],
	[ '902',  '0', 'Local Tram Service', 'Munich (DE), Brussels (BE), Croydon (GB)'],
	[ '903',  '0', 'Regional Tram Service', null],
	[ '904',  '0', 'Sightseeing Tram Service', 'Blackpool Seafront (GB)'],
	[ '905',  '0', 'Shuttle Tram Service', null],
	[ '906',  '0', 'All Tram Services', null],
	['1000',  '4', 'Water Transport Service', null],
	['1100',  '6', 'Air Service', null],
	['1200',  '4', 'Ferry Service', null],
	['1300',  '6', 'Aerial Lift Service', 'Telefèric de Montjuïc (ES), Saleve (CH), Roosevel, foot Island Tramway (US)', null],
	['1400',  '7', 'Funicular Service', 'Rigiblick (Zürich, CH)'],
	['1500', null, 'Taxi Service', null],
	['1501', null, 'Communal Taxi Service', 'Marshrutka (RU), dolmuş (TR)'],
	['1502',  '4', 'Water Taxi Service', null],
	['1503',  '0', 'Rail Taxi Service', null],
	['1504', null, 'Bike Taxi Service', null],
	['1505', null, 'Licensed Taxi Service', null],
	['1506', null, 'Private Hire Service Vehicle', null],
	['1507', null, 'All Taxi Services', null],
	['1700', null, 'Miscellaneous Service', null],
	['1702', null, 'Horse-drawn Carriage', null],
]

// proposed TPEG-PTI-derived route types
// https://groups.google.com/g/gtfs-changes/c/keT5rTPS7Y0/m/71uMz2l6ke0J
const tpegPtiExtendedRouteTypes = [
	[ '100',  '2', 'Railway Service'],
	[ '101',  '2', 'High Speed Rail Service'],
	[ '102',  '2', 'Long Distance Trains'],
	[ '103',  '2', 'Inter Regional Rail Service'],
	[ '104',  '2', 'Car Transport Rail Service'],
	[ '105',  '2', 'Sleeper Rail Service'],
	[ '106',  '2', 'Regional Rail Service'],
	[ '107',  '2', 'Tourist Railway Service'],
	[ '108',  '0', 'Rail Shuttle (Within Complex)'],
	[ '109',  '0', 'Suburban Railway'],
	[ '110',  '0', 'Replacement Rail Service'],
	[ '111',  '2', 'Special Rail Service'],
	[ '112',  '0', 'Lorry Transport Rail Service'],
	[ '113',  '2', 'All Rail Services'],
	[ '114',  '2', 'Cross-Country Rail Service'],
	[ '115',  '2', 'Vehicle Transport Rail Service'],
	[ '116',  '0', 'Rack and Pinion Railway'],
	[ '117',  '0', 'Additional Rail Service'],

	[ '200',  '3', 'Coach Service'],
	[ '201',  '3', 'International Coach Service'],
	[ '202',  '3', 'National Coach Service'],
	[ '203',  '3', 'Shuttle Coach Service'],
	[ '204',  '3', 'Regional Coach Service'],
	[ '205',  '3', 'Special Coach Service'],
	[ '206',  '3', 'Sightseeing Coach Service'],
	[ '207',  '3', 'Tourist Coach Service'],
	[ '208',  '3', 'Commuter Coach Service'],
	[ '209',  '3', 'All Coach Services'],

	[ '300',  '0', 'Suburban Railway Service'],

	[ '400',  '0', 'Urban Railway Service'],
	[ '401',  '0', 'Metro Service'],
	[ '402',  '0', 'Underground Service'],
	[ '403',  '0', 'Urban Railway Service'],
	[ '404',  '0', 'All Urban Railway Services'],

	[ '500',  '0', 'Metro Service'],

	[ '600',  '0', 'Underground Service'],

	[ '700',  '3', 'Bus Service'],
	[ '701',  '3', 'Regional Bus Service'],
	[ '702',  '3', 'Express Bus Service'],
	[ '703',  '3', 'Stopping Bus Service'],
	[ '704',  '3', 'Local Bus Service'],
	[ '705',  '3', 'Night Bus Service'],
	[ '706',  '3', 'Post Bus Service'],
	[ '707',  '3', 'Special Needs Bus'],
	[ '708',  '3', 'Mobility Bus Service'],
	[ '709',  '3', 'Mobility Bus for Registered Disabled'],
	[ '710',  '3', 'Sightseeing Bus'],
	[ '711',  '3', 'Shuttle Bus'],
	[ '712',  '3', 'School Bus'],
	[ '713',  '3', 'School and Public Service Bus'],
	[ '714',  '3', 'Rail Replacement Bus Service'],
	[ '715',  '3', 'Demand and Response Bus Service'],
	[ '716',  '3', 'All Bus Services'],

	[ '800', '11', 'Trolleybus Service'],

	[ '900',  '0', 'Tram Service'],
	[ '901',  '0', 'City Tram Service'],
	[ '902',  '0', 'Local Tram Service'],
	[ '903',  '0', 'Regional Tram Service'],
	[ '904',  '0', 'Sightseeing Tram Service'],
	[ '905',  '0', 'Shuttle Tram Service'],
	[ '906',  '0', 'All Tram Services'],

	['1000',  '4', 'Water Transport Service'],
	['1001',  '4', 'International Car Ferry Service'],
	['1002',  '4', 'National Car Ferry Service'],
	['1003',  '4', 'Regional Car Ferry Service'],
	['1004',  '4', 'Local Car Ferry Service'],
	['1005',  '4', 'International Passenger Ferry Service'],
	['1006',  '4', 'National Passenger Ferry Service'],
	['1007',  '4', 'Regional Passenger Ferry Service'],
	['1008',  '4', 'Local Passenger Ferry Service'],
	['1009',  '4', 'Post Boat Service'],
	['1010',  '4', 'Train Ferry Service'],
	['1011',  '4', 'Road-Link Ferry Service'],
	['1012',  '4', 'Airport-Link Ferry Service'],
	['1013',  '4', 'Car High-Speed Ferry Service'],
	['1014',  '4', 'Passenger High-Speed Ferry Service'],
	['1015',  '4', 'Sightseeing Boat Service'],
	['1016',  '4', 'School Boat'],
	['1017',  '4', 'Cable-Drawn Boat Service'],
	['1018',  '4', 'River Bus Service'],
	['1019',  '4', 'Scheduled Ferry Service'],
	['1020',  '4', 'Shuttle Ferry Service'],
	['1021',  '4', 'All Water Transport Services'],

	['1100', null, 'Air Service'],
	['1101', null, 'International Air Service'],
	['1102', null, 'Domestic Air Service'],
	['1103', null, 'Intercontinental Air Service'],
	['1104', null, 'Domestic Scheduled Air Service'],
	['1105', null, 'Shuttle Air Service'],
	['1106', null, 'Intercontinental Charter Air Service'],
	['1107', null, 'International Charter Air Service'],
	['1108', null, 'Round-Trip Charter Air Service'],
	['1109', null, 'Sightseeing Air Service'],
	['1110', null, 'Helicopter Air Service'],
	['1111', null, 'Domestic Charter Air Service'],
	['1112', null, 'Schengen-Area Air Service'],
	['1113', null, 'Airship Service'],
	['1114', null, 'All Air Services'],

	['1200',  '4', 'Ferry Service'],

	['1300',  '6', 'Telecabin Service'],
	['1301',  '6', 'Telecabin Service'],
	['1302',  '6', 'Cable Car Service'],
	['1303',  '6', 'Elevator Service'],
	['1304',  '6', 'Chair Lift Service'],
	['1305',  '6', 'Drag Lift Service'],
	['1306',  '6', 'Small Telecabin Service'],
	['1307',  '6', 'All Telecabin Services'],

	['1400',  '7', 'Funicular Service'],
	['1401',  '7', 'Funicular Service'],
	['1402',  '7', 'All Funicular Service'],

	['1500', null, 'Taxi Service'],
	['1501', null, 'Communal Taxi Service'],
	['1502',  '4', 'Water Taxi Service'],
	['1503',  '2', 'Rail Taxi Service'],
	['1504', null, 'Bike Taxi Service'],
	['1505', null, 'Licensed Taxi Service'],
	['1506', null, 'Private Hire Service Vehicle'],
	['1507', null, 'All Taxi Services'],

	['1600', null, 'Self Drive'],
	['1601', null, 'Hire Car'],
	['1602', null, 'Hire Van'],
	['1603', null, 'Hire Motorbike'],
	['1604', null, 'Hire Cycle'],
	['1605', null, 'All Self-Drive Vehicles'],
]

const routeTypesSchemes = Object.assign(Object.create(null), {
	'basic': [],
	'google-extended': googleExtendedRouteTypes,
	'tpeg-pti': tpegPtiExtendedRouteTypes,
})

const formatRouteType = (route_type) => {
	return route_type === null ? 'NULL' : `'${route_type}'`
}

// https://gtfs.org/schedule/reference/#routestxt
const beforeAll = (opt) => {
	if (!(opt.routeTypesScheme in routeTypesSchemes)) {
		throw new Error(`invalid opt.routeTypesScheme, must be one of these: ${Object.keys(routeTypesSchemes).join(', ')}.`)
	}
	const extRouteTypes = routeTypesSchemes[opt.routeTypesScheme]

	return `\
CREATE TABLE "${opt.schema}".route_types (
	route_type TEXT PRIMARY KEY,
	basic_route_type TEXT,
	FOREIGN KEY (basic_route_type) REFERENCES "${opt.schema}".route_types (route_type)
);

INSERT INTO "${opt.schema}".route_types (
	route_type,
	basic_route_type
) VALUES
	-- basic types
	  ( '0',  '0') -- Tram, Streetcar, Light rail. Any light rail or street level system within a metropolitan area.
	, ( '1',  '1') -- Subway, Metro. Any underground rail system within a metropolitan area.
	, ( '2',  '2') -- Rail. Used for intercity or long-distance travel.
	, ( '3',  '3') -- Bus. Used for short- and long-distance bus routes.
	, ( '4',  '4') -- Ferry. Used for short- and long-distance boat service.
	, ( '5',  '5') -- Cable tram. Used for street-level rail cars where the cable runs beneath the vehicle, e.g., cable car in San (Francisco.
	, ( '6',  '6') -- Aerial lift, suspended cable car (e.g., gondola lift, aerial tramway). Cable transport where cabins, cars, (gondolas or open chairs are suspended by means of one or more cables.
	, ( '7',  '7') -- Funicular. Any rail system designed for steep inclines.
	, ('11', '11') -- Trolleybus. Electric buses that draw power from overhead wires using poles.
	, ('12', '12') -- Monorail. Railway in which the track consists of a single rail or a beam.

	-- extended types
${extRouteTypes.map(([route_type, basic_route_type, desc]) => `\t, (${formatRouteType(route_type)}, ${formatRouteType(basic_route_type)}) -- ${desc}`).join('\n')}
;

CREATE TABLE "${opt.schema}".routes (
	route_id TEXT PRIMARY KEY,
	agency_id TEXT,
	${opt.routesWithoutAgencyId ? '' : `FOREIGN KEY (agency_id) REFERENCES "${opt.schema}".agency,`}
	-- todo: Either route_short_name or route_long_name must be specified, or potentially both if appropriate.
	route_short_name TEXT,
	route_long_name TEXT,
	route_desc TEXT,
	route_type TEXT NOT NULL,
	FOREIGN KEY (route_type) REFERENCES "${opt.schema}".route_types,
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
