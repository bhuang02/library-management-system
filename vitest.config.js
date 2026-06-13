// vitest.config.js
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/helpers/vitest.setup.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ['default']
  }
});
