import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('root index switches main entry to Vue frontend', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\.\/frontend\/src\/main\.ts"/);
});
