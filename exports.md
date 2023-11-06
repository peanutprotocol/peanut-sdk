# webpack.config.cjs:
=====
const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const packageJSON = require('./package.json')

const isProduction = process.env.NODE_ENV === 'production'
console.log('Building for production:', isProduction)

const common = {
entry: './src/index.ts',
// devtool: isProduction ? 'cheap-module-source-map' : 'eval-source-map',
devtool: 'source-map',
mode: isProduction ? 'production' : 'development',
module: {
rules: [
{
test: /\.(m?js|ts)$/,
				exclude: /(node_modules|bower_components|examples|test|other|dist)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env', '@babel/preset-typescript'],
						plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-syntax-import-assertions'],
					},
				},
			},
		],
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.VERSION': JSON.stringify(packageJSON.version),
		}),
	],
	optimization: {
		minimize: false, // disabled for better debugging
		minimizer: [
			new TerserPlugin({
				extractComments: {
					condition: 'some',
					filename: (fileData) => {
						return `${fileData.filename}.LICENSE.txt${fileData.query}`					},
					banner: (licenseFile) => {
						return`License information can be found in ${licenseFile}`
},
},
}),
],
},
experiments: {
outputModule: true,
},
resolve: {
fallback: {
// we're using different libraries now, so no need for crypto-browserify
// crypto: require.resolve('crypto-browserify'),
},
extensions: ['.tsx', '.ts', '.js'],
},
}

const browserConfig = {
...common,
// mode: 'production',
// devtool: 'cheap-module-source-map',
output: {
filename: 'peanut-sdk.browser.js',
path: path.resolve(\_\_dirname, 'dist'),
library: {
type: 'module',
},
},
target: ['web', 'browserslist:> 1%, not dead, not ie 11, not op_mini all'],
}

const nodeConfig = {
...common,
// mode: 'production',
// devtool: 'cheap-module-source-map',
output: {
filename: 'peanut-sdk.node.js',
path: path.resolve(\_\_dirname, 'dist'),
library: {
type: 'module',
},
},
target: ['node', 'es2020'],
}

module.exports = [browserConfig, nodeConfig]

# package.json:

{
"name": "@squirrel-labs/peanut-sdk",
"version": "0.3.6",
"description": "The Peanut Protocol SDK! Check out the documentation at https://docs.peanut.to",
"main": "dist/peanut-sdk.node.js",
"module": "dist/peanut-sdk.browser.js",
"types": "dist/index.d.ts",
"browser": {
"./dist/peanut-sdk.node.js": "./dist/peanut-sdk.browser.js",
"fs": false,
"path": false,
"os": false,
"crypto": false
},
"type": "module",
"scripts": {
"test": "npm run pkg-move && jest --coverage --silent",
"prettier": "prettier . --write",
"dry-run": "npm pack --dry-run",
"clean": "rm -r dist || true",
"build:bun": "bun bun.build.js",
"build:dev": "npm run clean && npm run pkg-move && npm run generate-types && webpack --config webpack.config.cjs --mode development",
"build": "npm run clean && npm run pkg-move && npm run generate-types && NODE_ENV=production webpack --config webpack.config.cjs --mode production",
"analyze": "webpack --profile --json > stats.json && webpack-bundle-analyzer stats.json",
"pkg-move": "cp package.json src/data/package.json",
"generate-types": "rm tsconfig.tsbuildinfo || true && tsc --emitDeclarationOnly",
"pre-git": "npm run prettier && npm run lint:fix && npm run test && npm run build:prod",
"git": "git add . && git commit -m 'Release' && git push",
"lint": "eslint '**/\*.{js,ts,tsx}' --quiet",
"lint:fix": "eslint '**/\*.{js,ts,tsx}' --fix",
"release": "npm run check-git-status && npm run test && npm run build:prod && npm version patch && npm run git && npm publish",
"check-git-status": "git diff-index --quiet HEAD -- || (echo \"ERROR: Git working directory is not clean.\" && exit 1)"
},
"repository": {
"type": "git",
"url": "git+https://github.com/ProphetFund/peanut-sdk"
},
"keywords": [
"crypto",
"evm",
"cryptography",
"links",
"ethers"
],
"author": "Hugo Montenegro, Konrad Urban",
"license": "UNLICENSED",
"bugs": {
"url": "https://github.com/ProphetFund/peanut-sdk/issues"
},
"homepage": "https://github.com/ProphetFund/peanut-sdk#readme",
"dependencies": {
"ethersv5": "npm:ethers@^5",
"isomorphic-fetch": "^3.0.0"
},
"publishConfig": {
"access": "public"
},
"devDependencies": {
"@babel/core": "^7.22.10",
"@babel/plugin-syntax-import-assertions": "^7.22.5",
"@babel/preset-env": "^7.22.10",
"@babel/preset-typescript": "^7.22.5",
"@ethersproject/abstract-provider": "^5.7.0",
"@jest/globals": "^29.6.2",
"@jest/transform": "^29.6.2",
"@types/isomorphic-fetch": "^0.0.36",
"@types/jest": "^29.5.4",
"@typescript-eslint/eslint-plugin": "^6.3.0",
"@typescript-eslint/parser": "^6.3.0",
"babel-jest": "^29.6.2",
"babel-loader": "^9.1.3",
"bufferutil": "^4.0.7",
"bun-types": "latest",
"crypto-browserify": "latest",
"dotenv": "^16.0.3",
"eslint": "^8.46.0",
"eslint-config-prettier": "^9.0.0",
"eslint-plugin-prettier": "^5.0.0",
"eslint-plugin-react": "^7.33.1",
"eslint-plugin-react-hooks": "^4.6.0",
"eslint-plugin-react-refresh": "^0.4.3",
"esm": "^3.2.25",
"jest": "^29.6.2",
"json-loader": "^0.5.7",
"mocha": "^10.2.0",
"npm-packlist": "^7.0.4",
"prettier": "^3.0.2",
"raw-loader": "^4.0.2",
"registry.npmjs.org": "^1.0.1",
"source-map-support": "^0.5.21",
"ts-jest": "^29.1.1",
"ts-loader": "^9.4.4",
"typescript": "^5.2.2",
"url": "^0.11.1",
"utf-8-validate": "^5.0.10",
"webpack": "^5.88.1",
"webpack-bundle-analyzer": "^4.9.1",
"webpack-cli": "^5.1.4",
"webpack-node-externals": "^3.0.0"
}
}
====================

# tsconfig.json

{
"compilerOptions": {
"target": "esnext",
"declaration": true,
"lib": ["dom", "dom.iterable", "esnext"],
"allowJs": true,
"skipLibCheck": true,
"strict": false,
"forceConsistentCasingInFileNames": true,
"esModuleInterop": true,
"module": "esnext",
"resolveJsonModule": true,
"isolatedModules": false,
"jsx": "preserve",
"incremental": true,
"outDir": "./dist",
"rootDir": "./src",
"moduleResolution": "node",
"sourceMap": true,
"allowImportingTsExtensions": true,
"emitDeclarationOnly": true
},
"include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"],
"exclude": ["node_modules", "test/**"]
}


The final items in dist/:
=========================
peanut-sdk.browser.js
peanut-sdk.browser.js.map
peanut-sdk.node.js
peanut-sdk.node.js.map
util.d.ts
config.d.ts
index.d.ts
data.d.ts
consts/

