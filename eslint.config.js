const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'dist-android/**', '.npm-cache/**', '.tooling/**', 'temp/**', 'test-results/**'] },
]);
