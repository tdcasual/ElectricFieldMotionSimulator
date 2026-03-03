import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const quickstartPath = 'QUICKSTART.md';
const hardCutPlanPath = 'docs/plans/2026-03-02-geometry-v2-hardcut-implementation-plan.md';
const docsIndexPath = 'docs/README.md';

test('quickstart documents v3 scene contract and does not require legacy top-level arrays', () => {
  const text = fs.readFileSync(quickstartPath, 'utf8');

  assert.match(
    text,
    /version.*3\.0|version.*revision.*running.*timeStep.*viewport.*selectedObjectId.*objects/si,
    'QUICKSTART must describe the v3 scene contract.'
  );

  assert.doesNotMatch(
    text,
    /必需字段[^。\n]*electricFields[^。\n]*magneticFields[^。\n]*particles/i,
    'QUICKSTART must not state legacy top-level arrays as required fields.'
  );
});

test('geometry v2 hard-cut plan status is fully closed', () => {
  const text = fs.readFileSync(hardCutPlanPath, 'utf8');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^-\s+Task\s+[1-7]\s*:/i.test(line));

  assert.equal(lines.length, 7, `Expected 7 task status lines, found ${lines.length}.`);
  for (const line of lines) {
    assert.match(line, /:\s*Completed$/i, `Expected completed status, got: ${line}`);
  }
});

test('docs index links to current debt paydown closure report', () => {
  const text = fs.readFileSync(docsIndexPath, 'utf8');
  assert.match(
    text,
    /docs\/release\/2026-03-03-tech-debt-paydown-closure-report\.md|2026-03-03-tech-debt-paydown-closure-report\.md/,
    'docs index must link to the current debt paydown closure report.'
  );
});
