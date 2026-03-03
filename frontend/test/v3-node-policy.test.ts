import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 node policy', () => {
  it('.nvmrc exists and is non-empty', () => {
    expect(existsSync('.nvmrc')).toBe(true);
    expect(readText('.nvmrc').trim().length).toBeGreaterThan(0);
  });

  it('package engines.node keeps >=24 <26 range', () => {
    const pkg = JSON.parse(readText('package.json'));
    expect(typeof pkg?.engines?.node).toBe('string');
    expect(pkg.engines.node).toMatch(/>=24\s*<26/);
  });

  it('README and TESTING-GUIDE mention Node 24/25 policy', () => {
    const combined = `${readText('README.md')}\n${readText('TESTING-GUIDE.md')}`;
    expect(combined).toMatch(/Node\.js[:：]?\s*.*24\.x/i);
    expect(combined).toMatch(/Node\.js[:：]?\s*.*25\.x/i);
  });
});
