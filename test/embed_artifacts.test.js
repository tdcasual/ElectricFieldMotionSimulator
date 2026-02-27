import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend embed artifacts exist', () => {
  assert.equal(fs.existsSync('frontend/viewer.html'), true, 'frontend/viewer.html should exist');
  assert.equal(fs.existsSync('frontend/public/embed.js'), true, 'frontend/public/embed.js should exist');
});
