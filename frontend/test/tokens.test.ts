import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('design tokens', () => {
  it('exports primary surface token', () => {
    const cssPath = path.resolve('frontend/src/styles/tokens.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css.includes('--bg-primary')).toBe(true);
  });
});
