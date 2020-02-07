const tsConfig = require("./tsconfig.json");

module.exports = {
    globals: {
        "ts-jest": {
            tsConfig: {
                ...tsConfig.compilerOptions,
                rootDir: "./",
                sourceMap: true
            },
            diagnostics: false
        }
    },
    transform: {
        "^.+\\.(t|j)sx?$": "ts-jest"
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(js?|ts?)$",
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
    collectCoverageFrom: ["src/**/*.ts", "!node_modules/**"]
};
