'use strict'

const {Stringifier} = require('csv-stringify')
const {Transform} = require('stream')

const createConverter = (spec) => {
	const {
		beforeAll,
		formatRow,
		afterAll,
	} = spec

	const csv = new Stringifier({quoted: true})

	let n = 0
	function transform (row, _, cb) {
		if (n++ === 0 && 'string' === typeof beforeAll) {
			this.push(beforeAll)
		}

		const formatted = csv.stringify(formatRow(row))
		this.push(formatted + '\n')
		cb()
	}
	function flush (cb) {
		if (n++ === 0 && 'string' === typeof beforeAll) {
			this.push(beforeAll)
		}
		if ('string' === typeof afterAll) this.push(afterAll + ';\n')
		cb()
	}

	return new Transform({objectMode: true, transform, flush})
}

module.exports = createConverter
