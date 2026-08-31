// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8090',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 8090 --bind 127.0.0.1',
    port: 8090,
    reuseExistingServer: false,
  },
});
