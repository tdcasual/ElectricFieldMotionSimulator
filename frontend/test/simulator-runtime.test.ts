import { describe, it, expect } from 'vitest';
import { registry } from '../../js/core/registerObjects.js';
import { SimulatorRuntime } from '../src/runtime/simulatorRuntime';

describe('SimulatorRuntime demo mode', () => {
  it('enters demo mode then restores previous scene on exit', () => {
    const runtime = new SimulatorRuntime();
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
  });
});
