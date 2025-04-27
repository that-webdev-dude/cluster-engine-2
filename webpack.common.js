const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { pages } = require("./project.config");

const devMode = process.env.NODE_ENV !== "production";
const filename = devMode ? "[name].js" : "[name].[contenthash].js";
const cssFilename = devMode ? "[name].css" : "[name].[contenthash].css";

module.exports = {
  entry: "./main.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: filename,
    clean: true,
    assetModuleFilename: "assets/[hash][ext][query]",
  },
  plugins: [
    ...pages.map((page) => new HtmlWebpackPlugin(page)),
    ...(devMode ? [] : [new MiniCssExtractPlugin({ filename: cssFilename })]),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        include: path.resolve(__dirname, "src"),
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/i,
        use: [
          devMode ? "style-loader" : MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
          "resolve-url-loader",
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              implementation: require("sass"),
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|mp3|wav)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(json)$/i,
        type: "asset/source",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(glsl|vert|frag)$/,
        type: "asset/source",
      },
    ],
  },
};
