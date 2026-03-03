import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 deploy contract', () => {
  it('docker serves frontend/dist artifact', () => {
    const dockerfile = readText('Dockerfile');
    expect(dockerfile).toMatch(/FROM\s+node:/i);
    expect(dockerfile).toMatch(/npm\s+run\s+build:frontend/i);
    expect(dockerfile).toMatch(/COPY\s+--from=.*frontend\/dist\s+\/usr\/share\/nginx\/html/i);
    expect(dockerfile).not.toMatch(/COPY\s+\.\s+\/usr\/share\/nginx\/html/i);
  });

  it('vercel output targets frontend/dist', () => {
    const config = JSON.parse(readText('vercel.json'));
    expect(config.outputDirectory).toBe('frontend/dist');
    expect(config.buildCommand).toBe('npm run build:frontend');
  });
});
