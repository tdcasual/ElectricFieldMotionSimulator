import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function readText(path) {
  return fs.readFileSync(path, 'utf8');
}

test('.nvmrc exists and defines a Node baseline', () => {
  assert.equal(fs.existsSync('.nvmrc'), true, '.nvmrc should exist');
  const value = readText('.nvmrc').trim();
  assert.notEqual(value, '', '.nvmrc should not be empty');
});

test('package.json defines engines.node compatibility range', () => {
  const pkg = JSON.parse(readText('package.json'));
  assert.equal(typeof pkg?.engines?.node, 'string', 'package.json engines.node should be defined');
  assert.match(pkg.engines.node, />=24\s*<26/, 'engines.node should include >=24 <26 range');
});

test('README and TESTING-GUIDE document Node runtime policy', () => {
  const readme = readText('README.md');
  const testingGuide = readText('TESTING-GUIDE.md');
  const combined = `${readme}\n${testingGuide}`;

  assert.match(combined, /Node\.js[:：]?\s*.*24\.x/i, 'docs should mention Node 24.x support');
  assert.match(combined, /Node\.js[:：]?\s*.*25\.x/i, 'docs should mention Node 25.x support');
  assert.match(combined, /CI.*Node\s*`?24`?.*25|Node\s*24.*25.*CI/i, 'docs should mention CI Node matrix intent');
});
