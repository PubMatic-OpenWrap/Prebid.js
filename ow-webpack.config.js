var path = require('path');

module.exports = {
    output: {
        filename: 'owt.js'
    },
    devtool: 'source-map',
    resolve: {
				modules: [path.resolve('./node_modules'), path.resolve('./modules')]
    },
    module: {
      rules: [
        {
          test: /(\.js)$/,
          loader: 'babel-loader',
          exclude: /(node_modules)/
        }
		  ]
    }
};
