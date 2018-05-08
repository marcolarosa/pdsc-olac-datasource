'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

const targetPath = path.resolve(
    __dirname,
    '../docker/api-service-production/api'
);

let copyFiles = [
    'archiver.py',
    'generate-current-language-list.py',
    'languages.csv',
    'languoid.csv',
    'reprocess.py',
    'src/__init__.py',
    'src/LanguageFactory.py'
];
copyFiles = copyFiles.map(f => {
    if (f.match('src/')) {
        return {
            from: `process-language-pages/${f}`,
            to: `${targetPath}/process-language-pages/src`
        };
    } else {
        return {
            from: `process-language-pages/${f}`,
            to: `${targetPath}/process-language-pages`
        };
    }
});
module.exports = {
    entry: './index.js',
    target: 'node',
    node: false,
    plugins: [
        new CopyWebpackPlugin(
            [{from: 'package.json', to: targetPath}, ...copyFiles],
            {}
        ),
        new webpack.DefinePlugin({'global.GENTLY': false})
    ],
    externals: [nodeExternals()]
};
