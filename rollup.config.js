import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import resolve from "rollup-plugin-node-resolve";
import builtins from "builtin-modules";

module.exports = {
    input: "./src/index.ts",
    output: {
        file: "dist/index.js",
        format: "cjs",
        exports: "named"
    },
    plugins: [
        typescript({
            useTsconfigDeclarationDir: true,
            objectHashIgnoreUnknownHack: true,
            typescript: require("typescript")
        }),
        commonjs(),
        resolve({
            preferBuiltins: true
        })
    ],
    external: [...builtins]
};