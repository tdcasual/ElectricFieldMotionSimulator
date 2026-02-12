import { describe, it, expect } from 'vitest';
import { isCommand } from '../src/engine/commands';

describe('engine command contract', () => {
  it('accepts addObject command payload', () => {
    expect(isCommand({ type: 'addObject', payload: { objectType: 'particle' } })).toBe(true);
  });
});
