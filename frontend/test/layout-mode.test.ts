import { describe, expect, it } from 'vitest';
import { PHONE_LAYOUT_MAX_WIDTH, TABLET_LAYOUT_MAX_WIDTH, resolveLayoutMode } from '../src/modes/layoutMode';

describe('resolveLayoutMode', () => {
  it('returns phone at or below phone breakpoint', () => {
    expect(resolveLayoutMode(PHONE_LAYOUT_MAX_WIDTH)).toBe('phone');
    expect(resolveLayoutMode(320)).toBe('phone');
  });

  it('returns phone for coarse-pointer landscape phones above width breakpoint', () => {
    expect(resolveLayoutMode(844, { viewportHeight: 390, isCoarsePointer: true })).toBe('phone');
    expect(resolveLayoutMode(932, { viewportHeight: 430, isCoarsePointer: true })).toBe('phone');
  });

  it('returns tablet between phone and tablet breakpoints', () => {
    expect(resolveLayoutMode(PHONE_LAYOUT_MAX_WIDTH + 1)).toBe('tablet');
    expect(resolveLayoutMode(TABLET_LAYOUT_MAX_WIDTH)).toBe('tablet');
    expect(resolveLayoutMode(844, { viewportHeight: 390, isCoarsePointer: false })).toBe('tablet');
  });

  it('returns desktop above tablet breakpoint', () => {
    expect(resolveLayoutMode(TABLET_LAYOUT_MAX_WIDTH + 1)).toBe('desktop');
    expect(resolveLayoutMode(1920)).toBe('desktop');
  });
});
