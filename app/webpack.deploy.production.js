"use strict";

const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
const nodeExternals = require("webpack-node-externals");
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const targetPath = path.resolve(
  __dirname,
  "../docker/api-service-production/api"
);

let copyFiles = [
  "archiver.py",
  "languages.csv",
  "languoid.csv",
  "reprocess.py",
  "scraper.py",
  "src/__init__.py",
  "src/LanguageFactory.py"
];
copyFiles = copyFiles.map(f => {
  if (f.match("src/")) {
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
  entry: "./index.js",
  target: "node",
  node: false,
  devtool: "source-map",
  mode: "production",
  output: {
    path: targetPath,
    filename: "index.js"
  },
  plugins: [
    new CopyWebpackPlugin(
      [{ from: "package.json", to: targetPath }, ...copyFiles],
      {}
    ),
    new webpack.DefinePlugin({ "global.GENTLY": false }),
    new CleanWebpackPlugin([`${targetPath}/*`], {
      watch: true,
      allowExternal: true
    }),
    new UglifyJSPlugin({ sourceMap: true }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production")
    })
  ],
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
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
