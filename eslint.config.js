import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**'
    ]
  },
  {
    files: ['frontend/src/**/*.ts', 'frontend/test/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../engine/internal/*',
                '../../engine/internal/*',
                '@/engine/internal/*'
              ],
              message: 'Use engine public API only.'
            }
          ]
        }
      ]
    }
  }
];
