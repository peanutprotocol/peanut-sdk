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
        // exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
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
    minimizer: [
      new TerserPlugin({
        // extractComments: {
        //   condition: "some",
        //   filename: (fileData) => {
        //     return `${fileData.filename}.LICENSE.txt${fileData.query}`;
        //   },
        //   banner: (licenseFile) => {
        //     return `License information can be found in ${licenseFile}`;
        //   },
        // },
      }),
    ],
  },
  // experiments: {
  //   topLevelAwait: true,
  //   asyncWebAssembly: true,
  //   outputModule: true, // big bugs, disable
  // },
};
