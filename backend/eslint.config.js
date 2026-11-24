export default [
  {
    ignores: ['node_modules/', 'prisma/migrations/', 'uploads-dev/'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
    }
  }
];
