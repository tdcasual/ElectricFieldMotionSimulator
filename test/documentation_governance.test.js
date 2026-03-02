import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const launchChecklistPath = 'docs/release/frontend-rewrite-launch-checklist.md';
const embedProtocolPath = 'docs/embed-protocol.md';
const hardCutPlanPath = 'docs/plans/2026-03-02-geometry-v2-hardcut-implementation-plan.md';

test('launch checklist does not keep unresolved checkbox items', () => {
  const text = fs.readFileSync(launchChecklistPath, 'utf8');
  const unresolved = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- [ ]'));

  assert.equal(
    unresolved.length,
    0,
    `Launch checklist has unresolved items:\n${unresolved.join('\n')}`
  );
});

test('embed protocol explicitly marks wildcard targetOrigin as dev-only and forbidden in production', () => {
  const text = fs.readFileSync(embedProtocolPath, 'utf8');

  assert.match(
    text,
    /dev-only/i,
    'Embed protocol must state wildcard targetOrigin usage is dev-only.'
  );

  assert.match(
    text,
    /must\s+pin\s+target\s*origin|must\s+set\s+target\s*origin|forbidden\s+in\s+production/i,
    'Embed protocol must state production targetOrigin hardening policy.'
  );
});

test('geometry hard-cut plan tracks current execution status in-document', () => {
  const text = fs.readFileSync(hardCutPlanPath, 'utf8');
  assert.match(text, /^##\s+Current\s+Status\b/m, 'Hard-cut plan must include a Current Status section.');

  const statusLines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^-\s+Task\s+[1-7]\s*:\s*(Completed|In Progress|Pending)\b/i.test(line));

  assert.equal(
    statusLines.length,
    7,
    `Expected 7 task status lines (Task 1..7), found ${statusLines.length}.`
  );
});
