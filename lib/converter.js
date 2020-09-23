'use strict'

const {Transform} = require('stream')
const sql = require('./sql')

const createConverter = (spec, headEvery = 1000) => {
	const {
		beforeAll,
		head,
		formatRow,
		afterAll,
	} = spec

	let n = 0
	function transform (row, _, cb) {
		if (n === 0 && 'string' === typeof beforeAll) {
			this.push(beforeAll)
		}

		const pre = (n++ % headEvery) === 0 ? `;\n${head}\n` : ',\n'
		this.push(pre + formatRow(sql, row))
		cb()
	}
	function flush (cb) {
		this.push(';\n')
		if ('string' === typeof afterAll) this.push(afterAll + ';\n')
		cb()
	}

	return new Transform({objectMode: true, transform, flush})
}

module.exports = createConverter
