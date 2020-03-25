const nodeExternals = require('webpack-node-externals');
const path = require('path');

module.exports = {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    entry: "./src/index.ts",
    target: "node",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "server.js",
    },
    module: {
        rules: [
            {
                enforce: "pre",
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: "tslint-loader",
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader",
                },
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    externals: [nodeExternals()]
};
