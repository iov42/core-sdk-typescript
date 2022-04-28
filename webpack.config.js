const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './iov42/core-sdk.ts',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
    fallback: {
        buffer: require.resolve('buffer/'),
    },
  },
  output: {
    filename: 'iov42.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var',
    library: 'iov42'
  },
  plugins: [
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
  ],
};