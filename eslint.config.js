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
                '../../../js/*',
                '../../js/*',
                '../engine/internal/*',
                '../../engine/internal/*',
                '@/engine/internal/*'
              ],
              message: 'Legacy runtime import paths are removed; use V3 modules under frontend/src/v3.'
            }
          ]
        }
      ]
    }
  }
];
