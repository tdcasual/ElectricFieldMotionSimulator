import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('design tokens', () => {
  it('exports refreshed shell and stage tokens', () => {
    const cssPath = path.resolve('styles/theme.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css.includes('--bg-primary')).toBe(true);
    expect(css.includes('--shell-bg')).toBe(true);
    expect(css.includes('--shell-surface')).toBe(true);
    expect(css.includes('--canvas-stage-bg')).toBe(true);
    expect(css.includes('--canvas-grid-major')).toBe(true);
    expect(css.includes('--canvas-grid-minor')).toBe(true);
    expect(css.includes('--status-strip-bg')).toBe(true);
    expect(css.includes('--teaching-accent')).toBe(true);
    expect(css.includes('--action-primary-bg')).toBe(true);
    expect(css.includes('--font-display')).toBe(true);
    expect(css.includes('--font-body')).toBe(true);
    expect(css.includes('--font-mono')).toBe(true);
  });
});
