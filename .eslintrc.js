module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        "eol-last": ["warn", "always"],
        "comma-dangle": ["warn", "always-multiline"],
        "quotes": ["warn", "single"],
        "sort-imports": "warn",
        "@typescript-eslint/no-empty-function": "off",
    },
};
