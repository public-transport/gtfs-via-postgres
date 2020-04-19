'use strict'

const {Transform} = require('stream')
const sql = require('./sql')

const createConverter = (formatRow, headEvery = 1000) => {
	let n = 0
	function write (row, _, cb) {
		const head = (n++ % headEvery) === 0
		const pre = head ? `;\n${formatRow.head}\n` : ',\n'
		this.push(pre + formatRow(sql, row))
		cb()
	}
	function writev (chunks, _, cb) {
		for (let i = 0; i < chunks.length; i++) {
			const row = chunks[i].chunk

			const head = (n++ % headEvery) === 0
			const pre = head ? `;\n${formatRow.head}\n` : ',\n'
			this.push(pre + formatRow(sql, row))
		}
		cb()
	}
	function flush (cb) {
		this.push(';\n')
		if ('string' === typeof formatRow.afterAll) {
			this.push(formatRow.afterAll)
		}
		cb()
	}

	return new Transform({objectMode: true, write, writev, flush})
}

module.exports = createConverter
