const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

// Reads TARGET env var — defaults to 'chrome'.
// Usage:  TARGET=firefox npm run build:firefox
const TARGET = process.env.TARGET || 'chrome';

/** @type {import('webpack').Configuration} */
const config = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts',
  },

  output: {
    // Each browser gets its own self-contained folder so you can load either
    // as an unpacked extension without touching the other.
    path: path.resolve(__dirname, `dist/${TARGET}`),
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
        // Copy the right manifest as manifest.json into the output folder
        {
          from: `manifest.${TARGET}.json`,
          to: 'manifest.json',
        },
        // Static assets — same for both browsers
        { from: 'src/netflix-bridge.js', to: 'netflix-bridge.js' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
};

module.exports = config;