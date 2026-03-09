import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_BUILD_BUDGETS = {
  baseline: {
    maxJsAssetBytes: 700 * 1024,
    description: 'Current regression guard for the largest emitted JS asset.'
  },
  target: {
    maxJsAssetBytes: 500 * 1024,
    description: 'Optimization target for the largest emitted JS asset.'
  }
};

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function enrichAsset(assetsDir, file) {
  const fullPath = path.join(assetsDir, file);
  const bytes = statSync(fullPath).size;
  return {
    file,
    path: fullPath,
    bytes,
    kib: Number((bytes / 1024).toFixed(2))
  };
}

function sortByBytesDesc(left, right) {
  return right.bytes - left.bytes || left.file.localeCompare(right.file);
}

export function resolveBuildDistDir({ cwd = process.cwd(), explicitDistDir } = {}) {
  if (explicitDistDir) {
    return path.resolve(cwd, explicitDistDir);
  }

  const candidates = [
    path.join(cwd, 'frontend', 'dist'),
    path.join(cwd, 'dist')
  ];

  const resolved = candidates.find((candidate) => existsSync(path.join(candidate, 'assets')));
  return resolved ?? candidates[0];
}

export function collectBuildArtifacts(distDir = resolveBuildDistDir()) {
  const resolvedDistDir = path.resolve(distDir);
  const assetsDir = path.join(resolvedDistDir, 'assets');

  if (!existsSync(assetsDir)) {
    throw new Error(`Build assets directory not found: ${assetsDir}`);
  }

  const assetFiles = readdirSync(assetsDir)
    .filter((file) => !file.startsWith('.'))
    .sort();

  const jsAssets = assetFiles
    .filter((file) => file.endsWith('.js'))
    .map((file) => enrichAsset(assetsDir, file))
    .sort(sortByBytesDesc);

  const cssAssets = assetFiles
    .filter((file) => file.endsWith('.css'))
    .map((file) => enrichAsset(assetsDir, file))
    .sort(sortByBytesDesc);

  return {
    distDir: resolvedDistDir,
    assetsDir,
    assetCount: assetFiles.length,
    jsAssets,
    cssAssets,
    largestJsAsset: jsAssets[0] ?? null,
    totalJsBytes: jsAssets.reduce((sum, asset) => sum + asset.bytes, 0),
    totalCssBytes: cssAssets.reduce((sum, asset) => sum + asset.bytes, 0)
  };
}

function normalizeBudgets(budgets = DEFAULT_BUILD_BUDGETS) {
  return {
    baseline: {
      ...DEFAULT_BUILD_BUDGETS.baseline,
      ...(budgets.baseline ?? {})
    },
    target: {
      ...DEFAULT_BUILD_BUDGETS.target,
      ...(budgets.target ?? {})
    }
  };
}

export function evaluateBuildBudget(report, { mode = 'baseline', budgets = DEFAULT_BUILD_BUDGETS } = {}) {
  const normalizedBudgets = normalizeBudgets(budgets);
  const activeBudget = normalizedBudgets[mode];

  if (!activeBudget) {
    throw new Error(`Unknown build budget mode: ${mode}`);
  }

  const largestJsBytes = report.largestJsAsset?.bytes ?? 0;
  const checks = [
    {
      label: 'largest-js-asset',
      actualBytes: largestJsBytes,
      actualKiB: Number((largestJsBytes / 1024).toFixed(2)),
      limitBytes: activeBudget.maxJsAssetBytes,
      limitKiB: Number((activeBudget.maxJsAssetBytes / 1024).toFixed(2)),
      ok: largestJsBytes <= activeBudget.maxJsAssetBytes
    }
  ];

  return {
    mode,
    ok: checks.every((check) => check.ok),
    budgets: normalizedBudgets,
    largestJsAsset: report.largestJsAsset,
    totalJsBytes: report.totalJsBytes,
    totalCssBytes: report.totalCssBytes,
    checks,
    targetDeltaBytes: largestJsBytes - normalizedBudgets.target.maxJsAssetBytes
  };
}

function printSummary(report, evaluation) {
  const largestLabel = report.largestJsAsset
    ? `${report.largestJsAsset.file} (${formatKiB(report.largestJsAsset.bytes)})`
    : 'none';
  const status = evaluation.ok ? 'PASS' : 'FAIL';
  const deltaLabel = `${formatKiB(Math.abs(evaluation.targetDeltaBytes))} ${evaluation.targetDeltaBytes > 0 ? 'over' : 'under'}`;

  console.error('Build budget summary');
  console.error(`- Mode: ${evaluation.mode}`);
  console.error(`- Status: ${status}`);
  console.error(`- Dist: ${report.distDir}`);
  console.error(`- Largest JS asset: ${largestLabel}`);
  console.error(`- Total JS: ${formatKiB(report.totalJsBytes)}`);
  console.error(`- Total CSS: ${formatKiB(report.totalCssBytes)}`);
  console.error(`- Target delta vs 500 KiB: ${deltaLabel}`);
}

export async function runCli({ distDir = process.env.BUILD_BUDGET_DIST, mode = process.env.BUILD_BUDGET_MODE || 'baseline' } = {}) {
  const resolvedDistDir = resolveBuildDistDir({ explicitDistDir: distDir });
  const report = collectBuildArtifacts(resolvedDistDir);
  const evaluation = evaluateBuildBudget(report, { mode });
  const payload = {
    schemaVersion: '1.0',
    reportType: 'build-budget',
    generatedAt: new Date().toISOString(),
    distDir: report.distDir,
    mode,
    report,
    evaluation
  };

  printSummary(report, evaluation);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (!evaluation.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
