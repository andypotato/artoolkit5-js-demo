let HtmlWebpackPlugin = require('html-webpack-plugin');
let LiveReloadPlugin = require('webpack-livereload-plugin');
const path = require('path');
const fs = require('fs');

module.exports =  {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname,'dist'),
    filename: 'bundle.js'
  },
  resolve: {
    modules: [path.resolve(__dirname, '/src'), 'node_modules/'],
    descriptionFiles: ['package.json'],
    extensions : ['.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: 'file-loader',
      },
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html'
    }),
    new LiveReloadPlugin()
  ],
  devServer: {
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'cert') + '/localhost-key.pem'),
      cert: fs.readFileSync(path.resolve(__dirname, 'cert') + '/localhost.pem'),
    },
    contentBase: path.resolve('public')
  },
};
