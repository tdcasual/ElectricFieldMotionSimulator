import { describe, it, expect, vi } from 'vitest';
import { registry } from '../../js/core/registerObjects.js';
import { SimulatorRuntime } from '../src/runtime/simulatorRuntime';

describe('SimulatorRuntime demo mode', () => {
  it('mounts into demo mode by default', () => {
    const runtime = new SimulatorRuntime();
    runtime.mount();
    expect(runtime.getSnapshot().mode).toBe('demo');
    runtime.unmount();
  });

  it('enters demo mode then restores previous scene on exit', () => {
    const runtime = new SimulatorRuntime();
    runtime.mount();
    expect(runtime.getSnapshot().mode).toBe('demo');

    const exitedFirst = runtime.exitDemoMode();
    expect(exitedFirst).toBe(true);
    expect(runtime.getSnapshot().mode).toBe('normal');

    runtime.scene.addObject(registry.create('particle', { x: 100, y: 100 }));
    runtime.requestRender({ updateUI: true, trackBaseline: false });
    expect(runtime.getSnapshot().objectCount).toBe(1);
    expect(runtime.getSnapshot().mode).toBe('normal');

    const entered = runtime.enterDemoMode();
    expect(entered).toBe(true);
    expect(runtime.getSnapshot().mode).toBe('demo');
    expect(runtime.getSnapshot().objectCount).toBe(0);
    expect(runtime.scene.settings.gravity).toBe(0);

    const exited = runtime.exitDemoMode();
    expect(exited).toBe(true);
    expect(runtime.getSnapshot().mode).toBe('normal');
    expect(runtime.getSnapshot().objectCount).toBe(1);
    runtime.unmount();
  });

  it('unmount disposes drag-drop manager when present', () => {
    const runtime = new SimulatorRuntime() as unknown as {
      mounted: boolean;
      dragDropManager: { dispose: () => void } | null;
      unmount: () => void;
    };

    const dispose = vi.fn();
    runtime.mounted = true;
    runtime.dragDropManager = { dispose };

    runtime.unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
