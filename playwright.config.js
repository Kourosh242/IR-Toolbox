// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * On machines where Playwright's browser CDN is unreachable, run the suite
 * against the npm-bundled Chromium (@sparticuz/chromium) instead:
 *   E2E_SYSTEM_CHROMIUM=1 LD_LIBRARY_PATH=/tmp/al2023/lib npx playwright test
 * (extract once with: node -e "require('@sparticuz/chromium').executablePath()")
 * Default behavior (Playwright's own browsers) is unchanged when the env var is absent.
 */
let launchOptions = {};
if (process.env.E2E_SYSTEM_CHROMIUM === '1') {
  try {
    const mod = require('@sparticuz/chromium');
    const chromium = mod.default ?? mod; // ESM default export
    launchOptions = {
      executablePath: process.env.E2E_CHROMIUM_PATH || '/tmp/chromium',
      // drop Lambda-only flags that crash multi-context runs outside AWS
      args: chromium.args
        .filter((a) => !['--single-process', '--no-zygote'].includes(a))
        .map((a) => (a === "--headless='shell'" ? '--headless=shell' : a)),
    };
  } catch { /* fall back to Playwright's bundled browsers */ }
}

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8090',
    headless: true,
    launchOptions,
  },
  webServer: {
    command: 'python3 -m http.server 8090 --bind 127.0.0.1',
    port: 8090,
    reuseExistingServer: false,
  },
});
