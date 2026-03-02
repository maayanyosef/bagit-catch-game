import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: process.env.BAGIT_BASE_URL || 'http://127.0.0.1:4173',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx http-server -p 4173 .',
    port: 4173,
    reuseExistingServer: !!process.env.CI,
  },
});
