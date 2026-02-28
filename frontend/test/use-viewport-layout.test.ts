import { describe, expect, it, vi } from 'vitest';
import { useViewportLayout } from '../src/modes/useViewportLayout';

describe('useViewportLayout', () => {
  it('syncs layout mode from viewport width on mount and resize', () => {
    const setLayoutMode = vi.fn();
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 600
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
