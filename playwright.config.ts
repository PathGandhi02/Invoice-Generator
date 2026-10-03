import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: process.env.GIGAINVOICE_TEST_URL || 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1080 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: process.env.GIGAINVOICE_TEST_URL ? undefined : { command: 'node scripts/serve-web.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
});
