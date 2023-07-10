'use strict'

class DataError extends Error {
	constructor (fileName, message, explanation = null) {
		super(`${fileName}: ${message}`)
		this.fileName = fileName
		const expl = Array.isArray(explanation)
			// todo [breaking]: indent with \t
			? `\n  ${explanation.join('\n\t')}`
			: ''
		const asString = `${fileName}: ${message}${expl}`
		this.toString = () => asString
	}
}

module.exports = DataError
