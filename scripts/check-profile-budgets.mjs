import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateBrowserRenderBudgets,
  evaluateHighEmissionBudgets,
  formatBudgetEvaluation
} from './lib/perfBudget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function runProfileScript(scriptRelativePath, extraEnv = {}) {
  const result = spawnSync(process.execPath, [scriptRelativePath], {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.stderr?.trim()) {
    process.stderr.write(result.stderr.trimEnd() + '\n');
  }

  if (result.status !== 0) {
    throw new Error(`${scriptRelativePath} exited with code ${result.status}`);
  }

  const stdout = String(result.stdout || '').trim();
  if (!stdout) {
    throw new Error(`${scriptRelativePath} produced empty stdout`);
  }
  return JSON.parse(stdout);
}

const highEmissionReport = runProfileScript('scripts/profile-high-emission.mjs');
const browserRenderReport = runProfileScript('scripts/profile-browser-render.mjs', {
  PROFILE_BROWSER_PORT: process.env.PROFILE_BROWSER_PORT ?? '4795'
});

const highEmissionEntries = Array.isArray(highEmissionReport?.summaryRows)
  ? highEmissionReport.summaryRows
  : [];
const browserRenderEntries = Array.isArray(browserRenderReport?.summaryRows)
  ? browserRenderReport.summaryRows
  : [];

const evaluations = [
  evaluateHighEmissionBudgets(highEmissionEntries),
  evaluateBrowserRenderBudgets(browserRenderEntries)
];

for (const evaluation of evaluations) {
  process.stdout.write(formatBudgetEvaluation(evaluation) + '\n');
}

if (evaluations.some((evaluation) => !evaluation.ok)) {
  process.exitCode = 1;
}
