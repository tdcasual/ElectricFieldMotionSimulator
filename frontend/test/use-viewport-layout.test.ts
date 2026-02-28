import { describe, expect, it, vi } from 'vitest';
import { useViewportLayout } from '../src/modes/useViewportLayout';

describe('useViewportLayout', () => {
  it('syncs layout mode from viewport width on mount and resize', () => {
    const setLayoutMode = vi.fn();
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 600
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 900
    });

    const composable = useViewportLayout({ setLayoutMode });
    composable.mountViewportLayout();
    expect(setLayoutMode).toHaveBeenLastCalledWith('phone');

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1400
    });
    window.dispatchEvent(new Event('resize'));
    expect(setLayoutMode).toHaveBeenLastCalledWith('desktop');

    composable.unmountViewportLayout();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalHeight
    });
  });

  it('treats coarse-pointer wide landscape viewport as phone layout', () => {
    const setLayoutMode = vi.fn();
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    const originalMatchMedia = window.matchMedia;
    const originalTouchPoints = navigator.maxTouchPoints;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 844
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 390
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true })
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5
    });

    const composable = useViewportLayout({ setLayoutMode });
    composable.mountViewportLayout();
    expect(setLayoutMode).toHaveBeenLastCalledWith('phone');

    composable.unmountViewportLayout();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: originalHeight
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalTouchPoints
    });
  });

  it('detects coarse pointer from media query or touch points', () => {
    const setLayoutMode = vi.fn();
    const originalMatchMedia = window.matchMedia;
    const originalTouchPoints = navigator.maxTouchPoints;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 2
    });

    const composable = useViewportLayout({ setLayoutMode });
    composable.syncCoarsePointer();
    expect(composable.isCoarsePointer.value).toBe(true);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false })
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0
    });
    composable.syncCoarsePointer();
    expect(composable.isCoarsePointer.value).toBe(false);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalTouchPoints
    });
  });
});
