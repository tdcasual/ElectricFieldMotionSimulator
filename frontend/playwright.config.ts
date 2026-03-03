import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const e2eHost = process.env.E2E_HOST || '127.0.0.1';
const parsedPort = Number.parseInt(process.env.E2E_PORT ?? '', 10);
const e2ePort = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 4273;
const e2eBaseUrl = `http://${e2eHost}:${e2ePort}`;

export default defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  outputDir: path.join(repoRoot, 'output', 'playwright', 'test-results'),
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: e2eBaseUrl,
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `npm run dev:frontend -- --host ${e2eHost} --port ${e2ePort}`,
    url: e2eBaseUrl,
    cwd: repoRoot,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.spec\.ts/,
      testIgnore: /(touch-core-path|phone-touch-gestures|phone-import-recovery|phone-safe-area)\.spec\.ts/
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
      testMatch: /(touch-core-path|phone-touch-gestures|phone-import-recovery|phone-safe-area)\.spec\.ts/
    }
  ]
});
