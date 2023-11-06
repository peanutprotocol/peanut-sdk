const commonConfig = {
	trailingComma: 'es5',
	tabWidth: 4,
	semi: false,
	singleQuote: true,
	printWidth: 120,
	useTabs: true,
	endOfLine: 'auto',
}

module.exports = {
	...commonConfig,
	overrides: [
		{
			files: '*.yaml',
			options: {
				parser: 'yaml',
				ignore: true,
			},
		},
	],
}
