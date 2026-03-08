import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const e2eDir = path.join('frontend', 'e2e');
const hardcodedUrlPattern = /https?:\/\/(?:localhost|127\.0\.0\.1):5173/g;

test('playwright e2e specs do not hardcode the dev server host/port', () => {
  const specFiles = fs.readdirSync(e2eDir).filter((file) => file.endsWith('.spec.ts'));
  const offenders = [];

  for (const file of specFiles) {
    const fullPath = path.join(e2eDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    if (hardcodedUrlPattern.test(content)) {
      offenders.push(fullPath);
    }
    hardcodedUrlPattern.lastIndex = 0;
  }

  assert.deepEqual(offenders, []);
});

test('playwright config does not silently reuse an arbitrary existing server on the shared default port', () => {
  const content = fs.readFileSync(path.join('frontend', 'playwright.config.ts'), 'utf8');
  assert.doesNotMatch(content, /baseURL:\s*['"]http:\/\/127\.0\.0\.1:5173['"]/);
  assert.doesNotMatch(content, /url:\s*['"]http:\/\/127\.0\.0\.1:5173['"]/);
  assert.doesNotMatch(content, /reuseExistingServer:\s*true/);
});
