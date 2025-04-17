const webpack = require("webpack");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.CLUSTER_ENGINE_DEBUG": JSON.stringify(
        process.env.CLUSTER_ENGINE_DEBUG || "false"
      ),
    }),
  ],
});
