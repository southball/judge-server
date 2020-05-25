module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    'import/order': 'warn',
    'comma-dangle': ['warn', 'always-multiline'],
    'eol-last': ['warn', 'always'],
    quotes: ['warn', 'single', { allowTemplateLiterals: true }],
    'sort-imports': [
      'warn',
      {
        ignoreDeclarationSort: true,
        ignoreCase: true,
      },
    ],
  },
};
