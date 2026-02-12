import { describe, it, expect } from 'vitest';
import { createDemoSession } from '../src/modes/demoSession';

describe('demo session', () => {
  it('captures snapshot and restores on exit', () => {
    const session = createDemoSession({ objects: [{ id: 'a' }] });
    const restored = session.exit();
    expect(restored.objects[0].id).toBe('a');
  });
});
