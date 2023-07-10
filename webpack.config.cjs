const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './index.js',
  mode: 'development',
  output: {
    filename: 'peanut-sdk.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'peanut',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components|examples|test|other|dist)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    esmodules: true,
                  },
                },
              ],
            ],
            plugins: ['@babel/plugin-syntax-dynamic-import']
          },
        },
      },
    ],
  },
  optimization: {
    minimize: false,
    minimizer: [new TerserPlugin()],
  },
  experiments: {
    topLevelAwait: true,
    asyncWebAssembly: true,
    outputModule: true,
  },
};
