import { describe, it, expect, vi } from 'vitest';
import { registry } from '../src/engine/legacyBridge';
import { SimulatorRuntime } from '../src/runtime/simulatorRuntime';

describe('SimulatorRuntime demo mode', () => {
  it('mounts into demo mode by default', () => {
    const runtime = new SimulatorRuntime();
    runtime.mount();
    expect(runtime.getSnapshot().mode).toBe('demo');
    runtime.unmount();
  });

  it('binds renderer onto scene for responsive particle hit-testing', () => {
    const runtime = new SimulatorRuntime() as unknown as {
      scene: { renderer?: unknown };
      renderer: unknown;
      mount: () => void;
      unmount: () => void;
    };
    runtime.mount();
    expect(runtime.scene.renderer).toBe(runtime.renderer);
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

  it('builds geometry real/display fields for property payload', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = registry.create('magnetic-field-circle', {
      x: 0,
      y: 0,
      radius: 50,
      width: 100,
      height: 100
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    const payload = runtime.buildPropertyPayload();
    expect(payload).toBeTruthy();
    const keys = (payload?.sections ?? [])
      .flatMap((section) => section.fields ?? [])
      .map((field) => field.key);

    expect(keys).toContain('radius');
    expect(keys).toContain('radius__display');
    expect(payload?.values.radius).toBe(1);
    expect(payload?.values.radius__display).toBe(50);
  });

  it('applying display geometry updates object scale without mutating real geometry', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = registry.create('magnetic-field-circle', {
      x: 0,
      y: 0,
      radius: 50,
      width: 100,
      height: 100
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    runtime.applySelectedProperties({ radius__display: '150' });
    const payload = runtime.buildPropertyPayload();

    expect(field.radius).toBe(150);
    expect(payload?.values.radius).toBe(1);
    expect(payload?.values.radius__display).toBe(150);
  });

  it('applying real geometry updates real and display values', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = registry.create('magnetic-field-circle', {
      x: 0,
      y: 0,
      radius: 50,
      width: 100,
      height: 100
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    runtime.applySelectedProperties({ radius: '2' });
    const payload = runtime.buildPropertyPayload();

    expect(payload?.values.radius).toBe(2);
    expect(payload?.values.radius__display).toBe(100);
    expect(field.radius).toBe(100);
  });
});
