const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode !== 'production';
  // const isBrowser = argv.target === 'web';
  
  return {
    entry: './index.js',
    target: ['web', 'browserslist:> 0.25%, not dead'],
    mode: 'development',
    devtool: isDevelopment ? 'source-map' : false,
    output: {
      filename: 'peanut-sdk.js',
      path: path.resolve(__dirname, 'dist'),
      library: {
        type: 'module',
      },
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
            condition: "some",
            filename: (fileData) => {
              return `${fileData.filename}.LICENSE.txt${fileData.query}`;
            },
            banner: (licenseFile) => {
              return `License information can be found in ${licenseFile}`;
            },
          },
        }),
      ],
    },
    experiments: {
      // topLevelAwait: true,
      // asyncWebAssembly: true,
      outputModule: true, // big bugs, disable
    },
  };
}
