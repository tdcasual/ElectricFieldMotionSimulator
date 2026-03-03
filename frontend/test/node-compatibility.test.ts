import { describe, expect, it } from 'vitest';

describe('frontend test runtime compatibility', () => {
  it('provides a localStorage object on window', () => {
    expect(typeof window).toBe('object');
    expect(window.localStorage).toBeDefined();
  });

  it('exposes callable localStorage methods', () => {
    expect(typeof window.localStorage.getItem).toBe('function');
    expect(typeof window.localStorage.setItem).toBe('function');
    expect(typeof window.localStorage.removeItem).toBe('function');
    expect(typeof window.localStorage.clear).toBe('function');
    expect(typeof window.localStorage.key).toBe('function');
  });
});
