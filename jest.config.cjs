const config = {
	testEnvironment: 'node',
	roots: ['<rootDir>/test'],
	transform: {
		'^.+\\.(js|jsx|mjs)?$': 'babel-jest',
		'^.+\\.tsx?$': 'ts-jest',
	},
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(ts|tsx|js|jsx|mjs)?$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
	// coverage shouldn't include node_modules or imported files
	coveragePathIgnorePatterns: [
		'/node_modules/',
		'peanut-sdk/node_modules/',
		'<rootDir>/test/',
		'<rootDir>/node_modules/',
	],
	transformIgnorePatterns: [
		"/node_modules/(?!(\\@squirrel-labs\\/peanut-sdk)/)",
		"/node_modules/(?!(\\@squirrel-labs\\/peanut-sdk)/)"
	],
	testPathIgnorePatterns: ['<rootDir>/test/manual/'],
	// try to test directly on index.js
	// moduleDirectories: ["node_modules", "src"],
	// moduleNameMapper: {
	//   "@squirrel-labs/peanut-sdk": "<rootDir>/index.js"
	// },
	// transformIgnorePatterns: ["<rootDir>/node_modules/"],
};

module.exports = config;
