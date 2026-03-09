import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { collectBuildArtifacts, evaluateBuildBudget, resolveBuildDistDir } from '../scripts/check-build-budget.mjs';

function withTempDir(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'build-budget-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function withTempDist(run) {
  return withTempDir((root) => {
    const assetsDir = path.join(root, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    return run({ root, assetsDir });
  });
}

test('collectBuildArtifacts sorts js assets and tracks the largest chunk', () => {
  withTempDist(({ assetsDir }) => {
    writeFileSync(path.join(assetsDir, 'main.js'), 'a'.repeat(410));
    writeFileSync(path.join(assetsDir, 'lazy.js'), 'b'.repeat(210));
    writeFileSync(path.join(assetsDir, 'main.css'), 'c'.repeat(32));

    const report = collectBuildArtifacts(path.dirname(assetsDir));

    assert.deepEqual(
      report.jsAssets.map((asset) => asset.file),
      ['main.js', 'lazy.js']
    );
    assert.equal(report.largestJsAsset.file, 'main.js');
    assert.equal(report.largestJsAsset.bytes, 410);
    assert.equal(report.totalJsBytes, 620);
    assert.equal(report.totalCssBytes, 32);
  });
});

test('evaluateBuildBudget enforces baseline and target thresholds independently', () => {
  const report = withTempDist(({ assetsDir }) => {
    writeFileSync(path.join(assetsDir, 'main.js'), 'x'.repeat(650));
    writeFileSync(path.join(assetsDir, 'chunk.js'), 'y'.repeat(120));
    return collectBuildArtifacts(path.dirname(assetsDir));
  });

  const budgets = {
    baseline: { maxJsAssetBytes: 700 },
    target: { maxJsAssetBytes: 500 }
  };

  const baselineResult = evaluateBuildBudget(report, { mode: 'baseline', budgets });
  const targetResult = evaluateBuildBudget(report, { mode: 'target', budgets });

  assert.equal(baselineResult.ok, true);
  assert.equal(targetResult.ok, false);
  assert.equal(targetResult.checks[0].actualBytes, 650);
  assert.equal(targetResult.checks[0].limitBytes, 500);
});

test('resolveBuildDistDir prefers frontend/dist for nested Vite builds', () => {
  withTempDir((root) => {
    const frontendAssetsDir = path.join(root, 'frontend', 'dist', 'assets');
    mkdirSync(frontendAssetsDir, { recursive: true });
    writeFileSync(path.join(frontendAssetsDir, 'main.js'), 'z'.repeat(42));

    assert.equal(resolveBuildDistDir({ cwd: root }), path.join(root, 'frontend', 'dist'));
  });
});
