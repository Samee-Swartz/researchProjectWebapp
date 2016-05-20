module.exports = {
  // where the root is located
  entry: "./app/components/Main.js",
  output: {
    filename: "./server/static/js/bundle.js"
  },
  module: {
    loaders: [
    { test: /\.jsx?$/, exclude: /(node_modules|bower_components)/,
      loader: 'babel', query: { presets: ['react', 'es2015'] } },

    ]
  }
}
