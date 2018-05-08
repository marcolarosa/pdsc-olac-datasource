'use strict';

const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const common = require('./webpack.common.js');

const targetPath = path.resolve(
    __dirname,
    '../docker/api-service-production/api'
);
module.exports = merge(common, {
    devtool: 'source-map',
    mode: 'production',
    output: {
        path: targetPath,
        filename: 'index.js'
    },
    plugins: [
        new CleanWebpackPlugin([`${targetPath}/*`], {
            watch: true,
            allowExternal: true
        }),
        new UglifyJSPlugin({sourceMap: true}),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ]
});
