import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('layer boundaries', () => {
  it('lint:frontend passes with boundary rules', () => {
    const result = spawnSync('npm', ['run', 'lint:frontend'], {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    expect(result.status).toBe(0);
  });
});
