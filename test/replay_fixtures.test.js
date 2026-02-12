import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const names = ['basic-electric', 'magnetic-arc', 'capacitor-deflection'];

test('replay fixtures exist and have objects array', () => {
  for (const name of names) {
    const filePath = path.join('test', 'fixtures', 'replay', `${name}.json`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    assert.equal(Array.isArray(data.objects), true);
  }
});
