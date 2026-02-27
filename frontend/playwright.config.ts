import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  outputDir: path.join(repoRoot, 'output', 'playwright', 'test-results'),
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev:frontend -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    cwd: repoRoot,
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
      testIgnore: /touch-core-path\.spec\.ts/
    },
    {
      name: 'tablet-chromium',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium'
      },
      testMatch: /touch-core-path\.spec\.ts/
    },
    {
      name: 'phone-chromium',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium'
      },
      testMatch: /touch-core-path\.spec\.ts/
    }
  ]
});
