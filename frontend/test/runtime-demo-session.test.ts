import { describe, expect, it, vi } from 'vitest';
import { captureRuntimeDemoSession, restoreRuntimeDemoSession } from '../src/runtime/runtimeDemoSession';

describe('runtimeDemoSession', () => {
  it('captures a deep-cloned demo session snapshot with selection context', () => {
    const source = { objects: [{ id: 'obj-1', x: 1 }] };
    const captured = captureRuntimeDemoSession({
      snapshot: source,
      wasRunning: true,
      selectedObjectId: 'obj-1'
    });

    expect(captured.wasRunning).toBe(true);
    expect(captured.selectedObjectId).toBe('obj-1');
    expect(captured.snapshot).toEqual(source);
    expect(captured.snapshot).not.toBe(source);
  });

  it('restores the saved snapshot and selection through callbacks', () => {
    const clear = vi.fn();
    const loadFromData = vi.fn();
    const restoreSelectedObjectById = vi.fn();

    restoreRuntimeDemoSession({
      scene: { clear, loadFromData },
      session: {
        snapshot: { objects: [{ id: 'obj-1' }] },
        wasRunning: false,
        selectedObjectId: 'obj-1'
      },
      restoreSelectedObjectById
    });

    expect(clear).toHaveBeenCalledTimes(1);
    expect(loadFromData).toHaveBeenCalledWith({ objects: [{ id: 'obj-1' }] });
    expect(restoreSelectedObjectById).toHaveBeenCalledWith('obj-1');
  });
});
