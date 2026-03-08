import { describe, it, expect, vi } from 'vitest';
import { registry } from '../src/engine/legacyBridge';
import { SimulatorRuntime } from '../src/runtime/simulatorRuntime';
import { Serializer } from '../src/engine/legacyBridge';

type TestSchemaField = {
  key: string;
  bind?: {
    set?: (...args: unknown[]) => void;
  };
};

type TestSchemaSection = {
  fields?: TestSchemaField[];
};

type TestRegistryEntryWithSchema = {
  schema: () => TestSchemaSection[];
};

type TestParticleWithVelocity = {
  velocity: {
    x: number;
    y: number;
  };
};

function requireSchemaEntry(type: string) {
  const entry = registry.get(type) as TestRegistryEntryWithSchema | null;
  expect(entry).toBeTruthy();
  if (!entry) {
    throw new Error(`Missing registry entry: ${type}`);
  }
  return entry;
}

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

  it('selects the newly created object when creating at center', () => {
    const runtime = new SimulatorRuntime();

    runtime.createObjectAtCenter('particle');

    expect(runtime.getSnapshot().objectCount).toBe(1);
    expect(runtime.getSnapshot().selectedObjectId).toBeTruthy();
    expect(runtime.scene.selectedObject).toBeTruthy();
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

  it('applying multiple consistent display geometry edits derives one shared object scale', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = registry.create('electric-field-rect', {
      x: 0,
      y: 0,
      width: 200,
      height: 150
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    runtime.applySelectedProperties({ width__display: '300', height__display: '225' });
    const payload = runtime.buildPropertyPayload();

    expect(payload?.values.width).toBe(4);
    expect(payload?.values.height).toBe(3);
    expect(payload?.values.width__display).toBe(300);
    expect(payload?.values.height__display).toBe(225);
  });



  it('caches dynamic expression schema lookup across repeated renders', () => {
    const runtime = new SimulatorRuntime();
    const entry = requireSchemaEntry('electric-field-rect');

    const schemaSpy = vi.spyOn(entry, 'schema');
    runtime.scene.addObject(registry.create('electric-field-rect', { x: 0, y: 0, width: 100, height: 80 }));
    runtime.scene.addObject(registry.create('electric-field-rect', { x: 40, y: 20, width: 120, height: 90 }));

    runtime.requestRender({ updateUI: false, trackBaseline: false });
    runtime.requestRender({ updateUI: false, trackBaseline: false });

    expect(schemaSpy).toHaveBeenCalledTimes(1);
  });


  it('skips re-applying numeric fallback values for particle expression fields', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 10;
    const entry = requireSchemaEntry('particle');

    const schema = entry.schema();
    const motionSection = schema[0];
    const vxField = (motionSection.fields ?? []).find((field: TestSchemaField) => field.key === 'vx');
    expect(vxField?.bind?.set).toBeTruthy();
    if (!vxField?.bind?.set) return;

    vi.spyOn(entry, 'schema').mockReturnValue(schema);
    const bindSetSpy = vi.spyOn(vxField.bind as { set: (...args: unknown[]) => void }, 'set');

    const particle = registry.create('particle', { x: 0, y: 0, vx: 4, vy: 0 }) as unknown as TestParticleWithVelocity;
    runtime.scene.addObject(particle);

    runtime.requestRender({ updateUI: false, trackBaseline: false });
    runtime.requestRender({ updateUI: false, trackBaseline: false });

    expect(bindSetSpy).not.toHaveBeenCalled();
    expect(particle.velocity.x).toBe(4);
  });

  it('re-evaluates expression-bound particle velocity when scene variables change', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 10;
    runtime.scene.variables = { a: 2 };
    const particle = registry.create('particle', { x: 0, y: 0, vx: 0, vy: 0 }) as unknown as TestParticleWithVelocity;
    runtime.scene.addObject(particle);
    runtime.scene.selectedObject = particle as never;

    runtime.applySelectedProperties({ vx: '2 * a' });
    expect(particle.velocity.x).toBe(40);

    runtime.scene.variables = { a: 3 };
    runtime.requestRender({ updateUI: true, trackBaseline: false });

    expect(particle.velocity.x).toBe(60);
    expect(runtime.buildPropertyPayload()?.values.vx).toBe('2 * a');
  });

  it('re-evaluates expression-bound particle velocity when scene time changes', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 10;
    runtime.scene.time = 1;
    const particle = registry.create('particle', { x: 0, y: 0, vx: 0, vy: 0 }) as unknown as TestParticleWithVelocity;
    runtime.scene.addObject(particle);
    runtime.scene.selectedObject = particle as never;

    runtime.applySelectedProperties({ vx: 't + 1' });
    expect(particle.velocity.x).toBe(20);

    runtime.scene.time = 4;
    runtime.requestRender({ updateUI: true, trackBaseline: false });

    expect(particle.velocity.x).toBe(50);
    expect(runtime.buildPropertyPayload()?.values.vx).toBe('t + 1');
  });




  it('clears particle trajectory cache when showTrajectory is disabled from properties', () => {
    const runtime = new SimulatorRuntime();
    const particle = registry.create('particle', { x: 0, y: 0, showTrajectory: true }) as Record<string, unknown>;
    particle.trajectory = [
      { x: 0, y: 0, t: 0 },
      { x: 10, y: 10, t: 1 }
    ];
    runtime.scene.addObject(particle as never);
    runtime.scene.selectedObject = particle as never;

    runtime.applySelectedProperties({ showTrajectory: false });

    expect(particle.showTrajectory).toBe(false);
    expect(particle.trajectory).toEqual([]);
  });

  it('rejects saving oversized scene payloads before storage write', () => {
    const runtime = new SimulatorRuntime();
    const saveSpy = vi.spyOn(Serializer, 'saveSceneData');

    for (let i = 0; i < 5001; i += 1) {
      runtime.scene.addObject(registry.create('particle', { x: i, y: 0 }));
    }

    const result = runtime.saveScene('oversized');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('对象数量超限');
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('rejects exporting oversized scene payloads before download', () => {
    const runtime = new SimulatorRuntime();
    const exportSpy = vi.spyOn(Serializer, 'exportToFile');

    for (let i = 0; i < 5001; i += 1) {
      runtime.scene.addObject(registry.create('particle', { x: i, y: 0 }));
    }

    const result = runtime.exportScene();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('对象数量超限');
    expect(exportSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid saved scene payloads during local load', () => {
    const runtime = new SimulatorRuntime();
    vi.spyOn(Serializer, 'loadScene').mockReturnValue({
      version: '1.0',
      objects: Array.from({ length: 5001 }, () => ({ type: 'particle' }))
    } as never);

    const result = runtime.loadScene('oversized');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('对象数量超限');
  });

  it('rejects conflicting display geometry edits instead of silently ignoring later fields', () => {
    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = registry.create('electric-field-rect', {
      x: 0,
      y: 0,
      width: 200,
      height: 150
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    expect(() => runtime.applySelectedProperties({ width__display: '300', height__display: '300' })).toThrow(
      /显示尺寸.*冲突|缩放/
    );

    const payload = runtime.buildPropertyPayload();
    expect(payload?.values.width__display).toBe(200);
    expect(payload?.values.height__display).toBe(150);
  });
});
