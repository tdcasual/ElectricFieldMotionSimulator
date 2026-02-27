import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('build:edgeone script exists and uses build-edgeone helper', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const script = pkg?.scripts?.['build:edgeone'];
  assert.equal(typeof script, 'string');
  assert.match(script, /scripts\/build-edgeone\.mjs/);
  assert.match(script, /--scene \.\/frontend\/public\/scenes\/material-mock-particle\.json/);
});
