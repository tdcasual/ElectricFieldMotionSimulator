import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('v3 entry contract', () => {
  it('root index points to frontend Vue entry', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<div id="root"><\/div>/);
    expect(html).toMatch(/src="\.\/frontend\/src\/main\.ts"/);
  });
});
