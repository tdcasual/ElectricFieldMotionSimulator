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
    ignores: ['frontend/src/engine/legacyBridge.ts'],
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
              message: 'Use frontend/src/engine/legacyBridge for legacy runtime imports.'
            }
          ]
        }
      ]
    }
  }
];
