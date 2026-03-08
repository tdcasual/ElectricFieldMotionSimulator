import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import {
  buildBrowserRenderTable,
  buildHighEmissionBrowserScenarios,
  summarizeBrowserRenderRun
} from './lib/browserRenderProfile.mjs';
import { buildBrowserRenderReport, emitProfileReport } from './lib/profileReport.mjs';

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function waitForServer(url, timeoutMs, logs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
      lastError = new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(500);
  }

  const recentLogs = logs.join('').trim();
  const parts = [`Timed out waiting for frontend server at ${url}.`];
  if (lastError instanceof Error) {
    parts.push(lastError.message);
  }
  if (recentLogs) {
    parts.push(recentLogs.slice(-4000));
  }
  throw new Error(parts.join('\n\n'));
}

function startFrontendServer(port) {
  const logs = [];
  const child = spawn(
    'npm',
    ['run', 'dev:frontend', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      env: {
        ...process.env,
        FORCE_COLOR: '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  child.stdout.on('data', (chunk) => {
    logs.push(String(chunk));
  });
  child.stderr.on('data', (chunk) => {
    logs.push(String(chunk));
  });

  const stop = async () => {
    if (child.exitCode !== null) return;
    child.kill('SIGTERM');
    const exited = await Promise.race([
      once(child, 'exit').then(() => true),
      delay(5000).then(() => false)
    ]);
    if (exited) return;
    child.kill('SIGKILL');
    await once(child, 'exit').catch(() => undefined);
  };

  return { child, logs, stop };
}

async function collectScenarioProfile(page, scenario, options) {
  const { durationMs, sampleEveryMs } = options;
  const raw = await page.evaluate(
    async ({ sceneData, durationMs: runDurationMs, sampleEveryMs: snapshotEveryMs }) => {
      const handle = window.__ELECTRIC_FIELD_PROFILE__;
      if (!handle) {
        throw new Error('Profile harness is not available on window.__ELECTRIC_FIELD_PROFILE__.');
      }

      const loadResult = handle.loadSceneData(sceneData);
      if (!loadResult?.ok) {
        throw new Error(loadResult?.error || 'Scene payload was rejected.');
      }

      const frameDeltas = [];
      const longTaskDurations = [];
      const snapshots = [];
      const canObserveLongTask = typeof PerformanceObserver === 'function'
        && Array.isArray(PerformanceObserver.supportedEntryTypes)
        && PerformanceObserver.supportedEntryTypes.includes('longtask');

      const pushSnapshot = (t) => {
        const snapshot = handle.getSnapshot();
        snapshots.push({
          t: Math.round(t),
          fps: Number(snapshot?.fps ?? 0),
          particleCount: Number(snapshot?.particleCount ?? 0),
          objectCount: Number(snapshot?.objectCount ?? 0),
          running: Boolean(snapshot?.running)
        });
      };

      let observer = null;
      if (canObserveLongTask) {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            longTaskDurations.push(entry.duration);
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      }

      handle.startRunning();
      const start = performance.now();
      let lastFrame = start;
      let lastSnapshotAt = start;
      pushSnapshot(0);

      await new Promise((resolve) => {
        const tick = (now) => {
          frameDeltas.push(now - lastFrame);
          lastFrame = now;
          if (now - lastSnapshotAt >= snapshotEveryMs) {
            pushSnapshot(now - start);
            lastSnapshotAt = now;
          }
          if (now - start >= runDurationMs) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      observer?.disconnect();
      handle.stopRunning();
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      pushSnapshot(performance.now() - start);

      return {
        durationMs: Math.round(performance.now() - start),
        frameDeltas,
        longTaskDurations,
        snapshots
      };
    },
    {
      sceneData: scenario.sceneData,
      durationMs,
      sampleEveryMs
    }
  );

  return summarizeBrowserRenderRun({
    name: scenario.name,
    ...raw
  });
}

const port = parsePositiveInt(process.env.PROFILE_BROWSER_PORT, 4795);
const durationMs = parsePositiveInt(process.env.PROFILE_DURATION_MS, 5000);
const sampleEveryMs = parsePositiveInt(process.env.PROFILE_SAMPLE_EVERY_MS, 250);
const startupTimeoutMs = parsePositiveInt(process.env.PROFILE_STARTUP_TIMEOUT_MS, 120000);
const headed = process.env.PROFILE_HEADFUL === '1';
const baseURL = `http://127.0.0.1:${port}`;

const server = startFrontendServer(port);
let browser;
let context;

try {
  await waitForServer(baseURL, startupTimeoutMs, server.logs);

  browser = await chromium.launch({ headless: !headed });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__ELECTRIC_FIELD_PROFILE__ === 'object', undefined, {
    timeout: startupTimeoutMs
  });

  const profiles = [];
  for (const scenario of buildHighEmissionBrowserScenarios()) {
    const profile = await collectScenarioProfile(page, scenario, { durationMs, sampleEveryMs });
    profiles.push(profile);
    await page.waitForTimeout(200);
  }

  const summaryRows = buildBrowserRenderTable(profiles);
  const report = buildBrowserRenderReport({
    generatedAt: new Date().toISOString(),
    config: { baseURL, durationMs, sampleEveryMs },
    profiles,
    summaryRows
  });

  emitProfileReport(report);
} finally {
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  await server.stop().catch(() => undefined);
}
