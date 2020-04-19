const {format: formatSql} = require('sqlstring')

const sql = (parts, ...vals) => {
	let sql = parts[0]
	for (let i = 1; i < parts.length; i++) {
		sql += '?' + parts[i]
	}
	return formatSql(sql, vals)
}

module.exports = sql
