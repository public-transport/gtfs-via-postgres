import eslint from '@eslint/js'
import globals from 'globals'

export default [
	eslint.configs.recommended,
	{
		languageOptions: {
			// necessary for top-level await
			ecmaVersion: 2022,
			globals: globals.node,
		},
		rules: {
			'no-unused-vars': [
				'warn',
				{
					vars: 'all',
					args: 'none',
					ignoreRestSiblings: false
				},
			],
			'no-irregular-whitespace': 'off',
		},
	},
]
