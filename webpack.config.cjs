import path from 'path'
import TerserPlugin from 'terser-webpack-plugin'

// Common Configuration
const common = {
	entry: './src/index.js',
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components|examples|test|other|dist)/, // exclude these folders from being transpiled
				use: {
					loader: 'babel-loader',
					options: {
						presets: [['@babel/preset-env']],
						plugins: ['@babel/plugin-syntax-dynamic-import', '@babel/plugin-syntax-import-assertions'],
					},
				},
			},
			{
				test: /\.json$/,
				type: 'javascript/auto',
				use: [
					{
						loader: 'json-loader',
					},
				],
			},
		],
	},
	optimization: {
		minimize: false,
		minimizer: [
			new TerserPlugin({
				extractComments: {
					condition: 'some',
					filename: (fileData) => {
						return `${fileData.filename}.LICENSE.txt${fileData.query}`
					},
					banner: (licenseFile) => {
						return `License information can be found in ${licenseFile}`
					},
				},
			}),
		],
	},
	experiments: {
		outputModule: true,
	},
}

// Configuration for browser
const browserConfig = {
	...common,
	mode: 'development',
	devtool: 'source-map',
	output: {
		filename: 'peanut-sdk.browser.js',
		path: path.resolve(__dirname, 'dist'),
		library: {
			type: 'module',
		},
	},
	target: ['web', 'browserslist:> 1%, not dead, not ie 11, not op_mini all'],
}

// Configuration for Node.js
const nodeConfig = {
	...common,
	mode: 'development',
	devtool: 'source-map',
	output: {
		filename: 'peanut-sdk.node.js',
		path: path.resolve(__dirname, 'dist'),
		library: {
			// type: 'commonjs2',
			type: 'module',
		},
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js'],
	},
	target: ['node', 'es2020'],
	// externals: [nodeExternals()], // causes problems with CommonJS require vs ES6 import :(
}

module.exports = [browserConfig, nodeConfig]
