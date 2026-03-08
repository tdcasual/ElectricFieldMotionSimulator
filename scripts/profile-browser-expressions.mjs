import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import {
  buildBrowserExpressionUiTable,
  buildExpressionUiBrowserScenarios,
  summarizeBrowserExpressionUiRun
} from './lib/browserExpressionUiProfile.mjs';
import { buildBrowserExpressionUiReport, emitProfileReport } from './lib/profileReport.mjs';

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
  if (lastError instanceof Error) parts.push(lastError.message);
  if (recentLogs) parts.push(recentLogs.slice(-4000));
  throw new Error(parts.join('\n\n'));
}

function startFrontendServer(port) {
  const logs = [];
  const child = spawn(
    'npm',
    ['run', 'dev:frontend', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));

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

async function prepareExpressionUiScenario(page, scenario) {
  await page.evaluate(({ sceneData }) => {
    const handle = window.__ELECTRIC_FIELD_PROFILE__;
    if (!handle) throw new Error('Profile harness is not available.');

    const loaded = handle.loadSceneData(sceneData);
    if (!loaded?.ok) throw new Error(loaded?.error || 'Scene payload was rejected.');

    const selected = handle.selectObjectByIndex(0);
    if (!selected?.ok) throw new Error(selected?.error || 'Failed to select target object.');

    if (!handle.openPropertyPanel()) {
      throw new Error('Failed to open property panel.');
    }
  }, { sceneData: scenario.sceneData });

  await page.locator('#property-panel').waitFor({ state: 'visible' });
  await page.locator('[data-testid="expression-hint-vx"]').waitFor({ state: 'visible' });
}

async function startCollector(page, sampleEveryMs) {
  await page.evaluate(({ sampleEveryMs }) => {
    const handle = window.__ELECTRIC_FIELD_PROFILE__;
    if (!handle) throw new Error('Profile harness is not available.');

    const previous = window.__EF_EXPR_UI_COLLECTOR__;
    if (previous?.stop) {
      previous.stop();
    }

    const frameDeltas = [];
    const longTaskDurations = [];
    const snapshots = [];
    const hintSamples = [];
    const start = performance.now();
    let lastFrameAt = null;
    let lastSampleAt = start;
    let active = true;
    let rafId = 0;

    const sample = (now) => {
      const t = Math.round(now - start);
      const snapshot = handle.getSnapshot();
      snapshots.push({
        t,
        fps: Number(snapshot?.fps ?? 0),
        particleCount: Number(snapshot?.particleCount ?? 0),
        objectCount: Number(snapshot?.objectCount ?? 0),
        running: Boolean(snapshot?.running)
      });
      const hintText = document.querySelector('[data-testid="expression-hint-vx"]')?.textContent?.trim() || '';
      if (hintText) {
        hintSamples.push({ t, text: hintText });
      }
    };

    let observer = null;
    const canObserveLongTask = typeof PerformanceObserver === 'function'
      && Array.isArray(PerformanceObserver.supportedEntryTypes)
      && PerformanceObserver.supportedEntryTypes.includes('longtask');
    if (canObserveLongTask) {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskDurations.push(entry.duration);
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }

    sample(start);

    const tick = (now) => {
      if (!active) return;
      if (lastFrameAt !== null) {
        frameDeltas.push(now - lastFrameAt);
      }
      lastFrameAt = now;
      if (now - lastSampleAt >= sampleEveryMs) {
        sample(now);
        lastSampleAt = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    window.__EF_EXPR_UI_COLLECTOR__ = {
      stop: async () => {
        active = false;
        cancelAnimationFrame(rafId);
        observer?.disconnect();
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        sample(performance.now());
        delete window.__EF_EXPR_UI_COLLECTOR__;
        return {
          durationMs: Math.round(performance.now() - start),
          frameDeltas,
          longTaskDurations,
          snapshots,
          hintSamples
        };
      }
    };
  }, { sampleEveryMs });
}

async function stopCollector(page) {
  return page.evaluate(async () => {
    const collector = window.__EF_EXPR_UI_COLLECTOR__;
    if (!collector?.stop) throw new Error('Collector is not running.');
    return collector.stop();
  });
}

async function runVariableScenario(page, scenario, options) {
  const { sampleEveryMs } = options;
  await prepareExpressionUiScenario(page, scenario);
  await startCollector(page, sampleEveryMs);

  let successfulIterations = 0;
  for (let i = 0; i < scenario.iterations; i += 1) {
    const nextA = 2 + i + 1;
    const nextB = 3 + i + 2;

    const opened = await page.evaluate(() => window.__ELECTRIC_FIELD_PROFILE__?.openVariablesPanel() === true);
    if (!opened) throw new Error('Failed to open variables panel.');

    const panel = page.locator('[data-testid="variables-panel"]');
    await panel.waitFor({ state: 'visible' });

    const nameInputs = panel.locator('.variables-grid input[type="text"]');
    const valueInputs = panel.locator('.variables-grid input[type="number"]');
    await nameInputs.nth(0).fill('a');
    await valueInputs.nth(0).fill(String(nextA));
    await nameInputs.nth(1).fill('b');
    await valueInputs.nth(1).fill(String(nextB));
    await panel.locator('[data-testid="apply-variables"]').click();

    await page.locator('#property-panel').waitFor({ state: 'visible' });
    await page.waitForFunction(
      (expected) => (document.querySelector('[data-testid="expression-hint-vx"]')?.textContent || '').includes(expected),
      `预览：${nextA + 1}`
    );
    successfulIterations += 1;
  }

  const raw = await stopCollector(page);
  return summarizeBrowserExpressionUiRun({
    name: scenario.name,
    iterations: scenario.iterations,
    successfulIterations,
    ...raw
  });
}

async function runTimeScenario(page, scenario, options) {
  const { durationMs, sampleEveryMs } = options;
  await prepareExpressionUiScenario(page, scenario);
  await startCollector(page, sampleEveryMs);

  await page.evaluate(() => {
    const handle = window.__ELECTRIC_FIELD_PROFILE__;
    if (!handle) throw new Error('Profile harness is not available.');
    handle.startRunning();
  });

  await page.waitForTimeout(durationMs);

  await page.evaluate(() => {
    const handle = window.__ELECTRIC_FIELD_PROFILE__;
    if (!handle) throw new Error('Profile harness is not available.');
    handle.stopRunning();
  });

  const raw = await stopCollector(page);
  return summarizeBrowserExpressionUiRun({
    name: scenario.name,
    iterations: 0,
    successfulIterations: 0,
    ...raw
  });
}

const port = parsePositiveInt(process.env.PROFILE_BROWSER_PORT, 4796);
const durationMs = parsePositiveInt(process.env.PROFILE_EXPR_DURATION_MS, 3000);
const sampleEveryMs = parsePositiveInt(process.env.PROFILE_EXPR_SAMPLE_EVERY_MS, 200);
const particleCount = parsePositiveInt(process.env.PROFILE_EXPR_PARTICLES, 1200);
const variableIterations = parsePositiveInt(process.env.PROFILE_EXPR_VARIABLE_ITERS, 4);
const startupTimeoutMs = parsePositiveInt(process.env.PROFILE_STARTUP_TIMEOUT_MS, 120000);
const headed = process.env.PROFILE_HEADFUL === '1';
const baseURL = `http://127.0.0.1:${port}`;

const server = startFrontendServer(port);
let browser;
let context;

try {
  await waitForServer(baseURL, startupTimeoutMs, server.logs);

  browser = await chromium.launch({ headless: !headed });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.__ELECTRIC_FIELD_PROFILE__ === 'object', undefined, { timeout: startupTimeoutMs });

  const scenarios = buildExpressionUiBrowserScenarios({ particleCount, variableIterations });
  const profiles = [];
  for (const scenario of scenarios) {
    if (scenario.mode === 'variable') {
      profiles.push(await runVariableScenario(page, scenario, { sampleEveryMs }));
    } else {
      profiles.push(await runTimeScenario(page, scenario, { durationMs, sampleEveryMs }));
    }
    await page.waitForTimeout(200);
  }

  const summaryRows = buildBrowserExpressionUiTable(profiles);
  const report = buildBrowserExpressionUiReport({
    generatedAt: new Date().toISOString(),
    config: { baseURL, particleCount, variableIterations, durationMs, sampleEveryMs },
    profiles,
    summaryRows
  });

  emitProfileReport(report);
} finally {
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  await server.stop().catch(() => undefined);
}
