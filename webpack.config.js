const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
const config = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts',
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },

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
    extensions: ['.ts', '.tsx', '.js'],
  },

  devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',

  target: 'web',

  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/netflix-bridge.js', to: 'netflix-bridge.js' },
      ],
    }),
  ],
};

module.exports = config;