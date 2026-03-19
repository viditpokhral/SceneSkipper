const path = require('path');

module.exports = {
  // Three separate entry points — Chrome extensions need separate bundles
  entry: {
    content:    './src/content.ts',
    background: './src/background.ts',
    popup:      './src/popup.ts',
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
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].js',       // → dist/content.js, dist/background.js, dist/popup.js
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
};
