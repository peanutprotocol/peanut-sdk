const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const packageJSON = require('./package.json')

const isProduction = process.env.NODE_ENV === 'production'
console.log('Building for production:', isProduction)

const common = {
	entry: './src/index.ts',
	devtool: isProduction ? 'cheap-module-source-map' : 'eval-source-map',
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
		minimize: true,
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
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
}

const browserConfig = {
	...common,
	// mode: 'production',
	// devtool: 'cheap-module-source-map',
	output: {
		filename: 'peanut-sdk.browser.js',
		path: path.resolve(__dirname, 'dist'),
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
		path: path.resolve(__dirname, 'dist'),
		library: {
			type: 'module',
		},
	},
	target: ['node', 'es2020'],
}

module.exports = [browserConfig, nodeConfig]
