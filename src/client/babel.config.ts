import { TransformOptions } from "@babel/core";

export const babelConfig: TransformOptions = {
    plugins: [
        "react-hot-loader/babel",
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-object-rest-spread",
        "@babel/plugin-proposal-optional-catch-binding",
        "@babel/plugin-syntax-dynamic-import",
        ["@babel/plugin-transform-runtime", { regenerator: true }],
    ],
    presets: [
        ["@babel/preset-env", { shippedProposals: true }],
        "@babel/preset-react",
    ],
};
