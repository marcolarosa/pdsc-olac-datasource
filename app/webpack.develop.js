"use strict";

const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const targetPath = path.resolve(__dirname, "./dist");

module.exports = {
    entry: "./index.js",
    target: "node",
    node: false,
    mode: "development",
    devtool: "source-map",
    output: {
        path: targetPath,
        filename: "index.js"
    },
    plugins: [
        new CleanWebpackPlugin([`${targetPath}/*.*`], {
            watch: true,
            exclude: ["./dist/node_modules"]
        }),
        new webpack.DefinePlugin({ "global.GENTLY": false }),
        new CopyWebpackPlugin([{ from: "package.json", to: targetPath }], {})
    ],
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"]
                    }
                }
            }
        ]
    },
    resolve: {
        alias: {
            src: path.resolve(__dirname, "src"),
            controllers: path.resolve(__dirname, "src/controllers"),
            routers: path.resolve(__dirname, "src/routers"),
            models: path.resolve(__dirname, "src/models")
        }
    }
};
