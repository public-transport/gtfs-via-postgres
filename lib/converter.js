'use strict'

const {Stringifier} = require('csv-stringify')
const {Transform} = require('stream')

const createConverter = (spec, opt) => {
	const {
		beforeAll,
		formatRow,
		afterAll,
	} = spec

	const csv = new Stringifier({quoted: true})

	let n = 0
	function transform (row, _, cb) {
		if (n++ === 0) {
			if ('string' === typeof beforeAll && beforeAll) {
				this.push(beforeAll)
			} else if ('function' === typeof beforeAll) {
				this.push(beforeAll(opt))
			}
		}

		const formatted = csv.stringify(formatRow(row, opt))
		this.push(formatted + '\n')
		cb()
	}
	function flush (cb) {
		if (n++ === 0 && 'string' === typeof beforeAll && beforeAll) {
			this.push(beforeAll)
		}
		if ('string' === typeof afterAll && afterAll) {
			this.push(afterAll + ';\n')
		} else if ('function' === typeof afterAll) {
			this.push(afterAll(opt) + ';\n')
		}
		cb()
	}

	return new Transform({objectMode: true, transform, flush})
}

module.exports = createConverter
