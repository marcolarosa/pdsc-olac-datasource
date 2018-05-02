'use strict';

const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.js'
    },
    target: 'node',
    node: {
        __filename: true,
        __dirname: true
    },
    devtool: 'source-map',
    plugins: [new webpack.DefinePlugin({'global.GENTLY': false})],
    module: {
        noParse: [/dtrace-provider/, /safe-json-stringify/, /mv/]
    },
    resolve: {
        alias: {
            src: path.resolve(__dirname, 'src')
        }
    }
};
