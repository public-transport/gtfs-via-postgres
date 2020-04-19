'use strict'

const a = require('assert')
const sql = require('./lib/sql')

a.strictEqual(sql `\
INSERT INTO foo (
	bar,
	baz,
	qux
) VALUES (
	${1},
	${'hey there'},
	${null}
)`, `\
INSERT INTO foo (
	bar,
	baz,
	qux
) VALUES (
	1,
	'hey there',
	NULL
)`)
// todo
