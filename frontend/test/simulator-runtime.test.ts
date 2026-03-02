import { describe, it, expect, vi } from 'vitest';
import { registry } from '../src/engine/runtimeEngineBridge';
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
      height: 100,
      geometry: {
        kind: 'circle',
        radius: 50
      }
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
      height: 100,
      geometry: {
        kind: 'circle',
        radius: 50
      }
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
      height: 100,
      geometry: {
        kind: 'circle',
        radius: 50
      }
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    runtime.applySelectedProperties({ radius: '2' });
    const payload = runtime.buildPropertyPayload();

    expect(payload?.values.radius).toBe(2);
    expect(payload?.values.radius__display).toBe(100);
    expect(field.radius).toBe(100);
  });

  it('supports geometry sourceKey mapping when schema key is not a geometry key', () => {
    const type = 'geometry-sourcekey-radius-test';
    const runtimeRegistry = registry as unknown as {
      get: (type: string) => {
        class: new (config?: Record<string, unknown>) => Record<string, unknown>;
      } | null;
      create: (type: string, data?: Record<string, unknown>) => Record<string, unknown>;
      register: (type: string, meta: Record<string, unknown>) => void;
    };

    const baseEntry = runtimeRegistry.get('magnetic-field');
    expect(baseEntry).toBeTruthy();

    class GeometrySourceKeyRadiusTestField extends (baseEntry?.class as new (config?: Record<string, unknown>) => {
      deserialize?: (data: Record<string, unknown>) => void;
      type?: string;
    }) {
      constructor(config: Record<string, unknown> = {}) {
        super(config);
        this.type = type;
        const inheritedDeserialize = this.deserialize;
        this.deserialize = (data: Record<string, unknown>) => {
          inheritedDeserialize?.call(this, data);
          this.type = type;
        };
      }
    }

    runtimeRegistry.register(type, {
      class: GeometrySourceKeyRadiusTestField,
      label: '几何 sourceKey 测试',
      category: 'magnetic',
      defaults: () => ({
        type,
        x: 0,
        y: 0,
        geometry: {
          kind: 'circle',
          radius: 50
        },
        strength: 0.5
      }),
      schema: () => ([
        {
          title: '测试',
          fields: [
            {
              key: 'geomRadius',
              sourceKey: 'radius',
              label: '半径',
              type: 'number',
              min: 1,
              step: 10
            }
          ]
        }
      ])
    });

    const runtime = new SimulatorRuntime();
    runtime.scene.settings.pixelsPerMeter = 50;
    const field = runtimeRegistry.create(type, {
      x: 0,
      y: 0,
      geometry: {
        kind: 'circle',
        radius: 50
      }
    });
    runtime.scene.addObject(field);
    runtime.scene.selectedObject = field as never;

    const payload = runtime.buildPropertyPayload();
    const keys = (payload?.sections ?? [])
      .flatMap((section) => section.fields ?? [])
      .map((field) => field.key);

    expect(keys).toContain('geomRadius');
    expect(keys).toContain('geomRadius__display');
    expect(payload?.values.geomRadius).toBe(1);
    expect(payload?.values.geomRadius__display).toBe(50);

    runtime.applySelectedProperties({ geomRadius: '2' });
    const updated = runtime.buildPropertyPayload();
    expect(updated?.values.geomRadius).toBe(2);
    expect(updated?.values.geomRadius__display).toBe(100);
  });

  it('createObjectAtCenter syncs renderer viewport before computing center point', () => {
    const runtime = new SimulatorRuntime() as unknown as {
      renderer: { resize: () => void; width: number; height: number };
      scene: {
        setViewport: (width: number, height: number) => void;
        getWorldViewportBounds: (padding: number) => { minX: number; maxX: number; minY: number; maxY: number };
      };
      dragDropManager: { createObject: (type: string, x: number, y: number) => void } | null;
      createObjectAtCenter: (type: string) => void;
    };

    runtime.renderer.width = 0;
    runtime.renderer.height = 0;
    const resizeSpy = vi.spyOn(runtime.renderer, 'resize').mockImplementation(() => {
      runtime.renderer.width = 744;
      runtime.renderer.height = 390;
    });
    const setViewportSpy = vi.spyOn(runtime.scene, 'setViewport');
    vi.spyOn(runtime.scene, 'getWorldViewportBounds').mockImplementation(() => ({
      minX: 0,
      maxX: 744,
      minY: 0,
      maxY: 390
    }));

    const createSpy = vi.fn();
    runtime.dragDropManager = { createObject: createSpy };

    runtime.createObjectAtCenter('particle');

    expect(resizeSpy).toHaveBeenCalledTimes(1);
    expect(setViewportSpy).toHaveBeenCalledWith(744, 390);
    expect(createSpy).toHaveBeenCalledWith('particle', 372, 195);
  });
});
