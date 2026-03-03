import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 doc governance', () => {
  it('quickstart documents v3 scene contract', () => {
    const text = readText('QUICKSTART.md');
    expect(text).toMatch(/version.*3\.0|version.*revision.*running.*timeStep.*viewport.*selectedObjectId.*objects/si);
    expect(text).not.toMatch(/必需字段[^。\n]*electricFields[^。\n]*magneticFields[^。\n]*particles/i);
  });

  it('launch checklist has no unresolved checkboxes', () => {
    const text = readText('docs/release/frontend-rewrite-launch-checklist.md');
    const unresolved = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- [ ]'));
    expect(unresolved).toHaveLength(0);
  });
});
