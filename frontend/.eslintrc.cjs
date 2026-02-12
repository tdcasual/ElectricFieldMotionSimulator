module.exports = {
  root: true,
  env: {
    es2023: true,
    node: true
  },
  ignorePatterns: ['dist', 'node_modules'],
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../engine/internal/*', '../../engine/internal/*', '@/engine/internal/*'],
                message: 'Use engine public API only.'
              }
            ]
          }
        ]
      }
    }
  ]
};
