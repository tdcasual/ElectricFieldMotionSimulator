import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('quality:all script exists', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(typeof pkg.scripts['quality:all'], 'string');
});
