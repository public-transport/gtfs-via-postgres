'use strict'

const {format: formatSql} = require('sqlstring')

const ESCAPED = Symbol('escaped SQL')

const sql = (parts, ...vals) => {
	let sql = parts[0]
	const usedVals = []
	for (let i = 1; i < parts.length; i++) {
		const val = vals[i - 1]
		if (val && val[ESCAPED]) {
			sql += '' + val
		} else {
			sql += '?'
			usedVals.push(val)
		}
		sql += parts[i]
	}
	const formatted = formatSql(sql, usedVals)

	const wrapper = {formatted}
	const toPrimitive = () => formatted
	Object.defineProperty(wrapper, ESCAPED, {value: true})
	Object.defineProperty(wrapper, Symbol.toPrimitive, {value: toPrimitive})
	Object.defineProperty(wrapper, valueOf, {value: toPrimitive})
	Object.defineProperty(wrapper, toString, {value: toPrimitive})
	Object.defineProperty(wrapper, Symbol.toStringTag, {value: 'sql'})
	return wrapper
}

module.exports = sql
