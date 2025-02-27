// INFO: This file is used only in case when OpenWrap AMP profile needs to work.

var path = require('path');

module.exports = {
    output: {
        filename: 'prebid.js'
    },
    devtool: 'source-map',
    resolve: {
				modules: [path.resolve('./node_modules'), path.resolve('./src')]
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
