import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Presets, Serializer } from '../src/engine/legacyBridge';
import { SimulatorRuntime } from '../src/runtime/simulatorRuntime';
import { useSimulatorStore } from '../src/stores/simulatorStore';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe('simulatorStore demo mode', () => {
  it('tracks layout mode with desktop/tablet/phone values', () => {
    const store = useSimulatorStore();
    expect((store as unknown as { layoutMode?: string }).layoutMode).toBe('desktop');

    (store as unknown as { setLayoutMode: (mode: string) => void }).setLayoutMode('tablet');
    expect((store as unknown as { layoutMode?: string }).layoutMode).toBe('tablet');

    (store as unknown as { setLayoutMode: (mode: string) => void }).setLayoutMode('phone');
    expect((store as unknown as { layoutMode?: string }).layoutMode).toBe('phone');
  });

  it('uses readable default markdown font size', () => {
    const store = useSimulatorStore();
    expect(store.markdownFontSize).toBe(16);
  });

  it('loads markdown font size from storage without legacy migration', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => (key === 'sim.markdown.fontSize' ? '13' : null),
        setItem: () => {},
        removeItem: () => {}
      }
    });
    try {
      const store = useSimulatorStore();
      expect(store.markdownFontSize).toBe(13);
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: original
      });
    }
  });

  it('toggles classroom mode state', () => {
    const store = useSimulatorStore();
    expect((store as unknown as { classroomMode?: boolean }).classroomMode).toBe(false);

    (store as unknown as { toggleClassroomMode: () => void }).toggleClassroomMode();
    expect((store as unknown as { classroomMode?: boolean }).classroomMode).toBe(true);

    (store as unknown as { setClassroomMode: (next: boolean) => void }).setClassroomMode(false);
    expect((store as unknown as { classroomMode?: boolean }).classroomMode).toBe(false);
  });

  it('toggles running state', () => {
    const store = useSimulatorStore();
    expect(store.running).toBe(false);
    store.toggleRunning();
    expect(store.running).toBe(true);
    store.toggleRunning();
    expect(store.running).toBe(false);
  });

  it('starts and stops running explicitly', () => {
    const store = useSimulatorStore();
    expect(store.running).toBe(false);
    store.startRunning();
    expect(store.running).toBe(true);
    store.stopRunning();
    expect(store.running).toBe(false);
  });

  it('enters demo mode and restores snapshot on exit', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    expect(store.objectCount).toBe(1);
    expect(store.demoMode).toBe(false);

    store.toggleDemoMode();
    expect(store.demoMode).toBe(true);
    expect(store.objectCount).toBe(0);

    store.toggleDemoMode();
    expect(store.demoMode).toBe(false);
    expect(store.objectCount).toBe(1);
  });

  it('restores property drawer after exiting demo mode when it was open before entering', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    const selectedId = store.selectedObjectId;

    expect(store.openPropertyPanel()).toBe(true);
    expect(store.propertyDrawerOpen).toBe(true);
    expect(store.activeDrawer).toBe('property');

    store.toggleDemoMode();
    expect(store.demoMode).toBe(true);
    expect(store.propertyDrawerOpen).toBe(false);

    store.toggleDemoMode();
    expect(store.demoMode).toBe(false);
    expect(store.selectedObjectId).toBe(selectedId);
    expect(store.propertyDrawerOpen).toBe(true);
    expect(store.activeDrawer).toBe('property');
  });

  it('loads preset and updates object count', () => {
    const store = useSimulatorStore();
    const ok = store.loadPreset('uniform-acceleration');
    expect(ok).toBe(true);
    expect(store.objectCount).toBeGreaterThan(0);
  });

  it('updates boundary margin visibility when boundary mode changes', () => {
    const store = useSimulatorStore();
    expect(store.showBoundaryMarginControl).toBe(true);
    store.setBoundaryMode('remove');
    expect(store.showBoundaryMarginControl).toBe(false);
    store.setBoundaryMode('margin');
    expect(store.showBoundaryMarginControl).toBe(true);
  });

  it('opens variables panel and applies variables to scene', () => {
    const store = useSimulatorStore();
    store.openVariablesPanel();
    expect(store.variablesPanelOpen).toBe(true);

    const ok = store.applyVariables({ a: 3, speedScale: 1.5 });
    expect(ok).toBe(true);
    expect(store.variablesPanelOpen).toBe(false);
    expect(store.variableDraft).toEqual({ a: 3, speedScale: 1.5 });
  });


  it('syncs variable draft to loaded scene variables without forcing variables panel closed', () => {
    const store = useSimulatorStore();
    store.applyVariables({ legacy: 1 });
    store.openVariablesPanel();
    expect(store.variableDraft).toEqual({ legacy: 1 });
    expect(store.variablesPanelOpen).toBe(true);

    const result = store.loadSceneData({
      version: '1.0',
      settings: {},
      variables: { a: 7, speedScale: 2.5 },
      objects: []
    });

    expect(result.ok).toBe(true);
    expect(store.variableDraft).toEqual({ a: 7, speedScale: 2.5 });
    expect(store.variablesPanelOpen).toBe(true);
  });

  it('syncs variable draft after successful local scene load', () => {
    const store = useSimulatorStore();
    store.applyVariables({ legacy: 1 });

    vi.spyOn(SimulatorRuntime.prototype, 'loadScene').mockImplementation(function (this: SimulatorRuntime) {
      this.scene.variables = { loaded: 9 };
      return { ok: true };
    });

    const ok = store.loadScene('vars-scene');

    expect(ok).toBe(true);
    expect(store.variableDraft).toEqual({ loaded: 9 });
  });

  it('syncs variable draft after loading preset scene variables', () => {
    const store = useSimulatorStore();
    store.applyVariables({ legacy: 1 });

    vi.spyOn(Presets, 'get').mockReturnValue({
      name: '变量预设',
      data: {
        version: '1.0',
        settings: {},
        variables: { speed: 3 },
        objects: []
      }
    } as never);

    const ok = store.loadPreset('vars-preset');

    expect(ok).toBe(true);
    expect(store.variableDraft).toEqual({ speed: 3 });
  });

  it('toggles markdown board and updates markdown preferences', () => {
    const store = useSimulatorStore();
    expect(store.markdownBoardOpen).toBe(false);
    store.toggleMarkdownBoard();
    expect(store.markdownBoardOpen).toBe(true);
    store.setMarkdownMode('edit');
    store.setMarkdownFontSize(16);
    store.setMarkdownContent('# Test');
    expect(store.markdownMode).toBe('edit');
    expect(store.markdownFontSize).toBe(16);
    expect(store.markdownContent).toContain('Test');
  });

  it('keeps only one drawer open at a time', () => {
    const store = useSimulatorStore();

    (store as unknown as { activeDrawer: string | null }).activeDrawer = 'property';
    expect(store.propertyDrawerOpen).toBe(true);
    expect(store.variablesPanelOpen).toBe(false);
    expect(store.markdownBoardOpen).toBe(false);

    store.openVariablesPanel();
    expect(store.propertyDrawerOpen).toBe(false);
    expect(store.variablesPanelOpen).toBe(true);
    expect(store.markdownBoardOpen).toBe(false);

    store.toggleMarkdownBoard();
    expect(store.variablesPanelOpen).toBe(false);
    expect(store.markdownBoardOpen).toBe(true);
    expect(store.propertyDrawerOpen).toBe(false);
  });


  it('restores property drawer after applying variables opened from property flow', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    expect(store.openPropertyPanel()).toBe(true);

    store.openVariablesPanel();
    expect(store.activeDrawer).toBe('variables');

    const ok = store.applyVariables({ a: 2 });
    expect(ok).toBe(true);
    expect(store.activeDrawer).toBe('property');
    expect(store.propertyDrawerOpen).toBe(true);
    expect(store.variablesPanelOpen).toBe(false);
  });

  it('restores previous drawer chain when nested drawers close', () => {
    const store = useSimulatorStore();
    store.createObjectAtCenter('particle');
    expect(store.openPropertyPanel()).toBe(true);

    store.toggleMarkdownBoard();
    expect(store.activeDrawer).toBe('markdown');

    store.openVariablesPanel();
    expect(store.activeDrawer).toBe('variables');

    store.closeVariablesPanel();
    expect(store.activeDrawer).toBe('markdown');
    expect(store.markdownBoardOpen).toBe(true);

    store.closeMarkdownBoard();
    expect(store.activeDrawer).toBe('property');
    expect(store.propertyDrawerOpen).toBe(true);
  });


  it('restores markdown board after closing property drawer opened above it', () => {
    const store = useSimulatorStore();
    store.toggleMarkdownBoard();
    store.createObjectAtCenter('particle');

    expect(store.openPropertyPanel()).toBe(true);
    expect(store.activeDrawer).toBe('property');

    store.closePropertyPanel();

    expect(store.activeDrawer).toBe('markdown');
    expect(store.markdownBoardOpen).toBe(true);
    expect(store.propertyDrawerOpen).toBe(false);
  });

  it('restores markdown board after deleting selected object closes property drawer', () => {
    const store = useSimulatorStore();
    store.toggleMarkdownBoard();
    store.createObjectAtCenter('particle');

    expect(store.openPropertyPanel()).toBe(true);
    expect(store.activeDrawer).toBe('property');

    store.deleteSelected();

    expect(store.selectedObjectId).toBe(null);
    expect(store.activeDrawer).toBe('markdown');
    expect(store.markdownBoardOpen).toBe(true);
    expect(store.propertyDrawerOpen).toBe(false);
  });

  it('clears active drawer when switching host mode to view', () => {
    const store = useSimulatorStore();
    store.openVariablesPanel();
    expect((store as unknown as { activeDrawer: string | null }).activeDrawer).toBe('variables');

    store.setHostMode('view');
    expect((store as unknown as { activeDrawer: string | null }).activeDrawer).toBe(null);
    expect(store.propertyDrawerOpen).toBe(false);
    expect(store.variablesPanelOpen).toBe(false);
    expect(store.markdownBoardOpen).toBe(false);
  });

  it('dispatches tap-chain reset event when closing property panel', () => {
    const store = useSimulatorStore();
    const dispatchSpy = vi.spyOn(document, 'dispatchEvent');
    (store as unknown as { activeDrawer: string | null }).activeDrawer = 'property';

    store.closePropertyPanel();

    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'simulator-reset-tap-chain' }));
  });

  it('closes property drawer when runtime snapshot clears selection', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'mount').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'setHostMode').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'getSnapshot').mockReturnValue({
      running: false,
      mode: 'normal',
      timeStep: 0.016,
      fps: 0,
      objectCount: 0,
      particleCount: 0,
      selectedObjectId: null,
      statusText: '就绪',
      geometryInteraction: null
    });

    (store as unknown as { activeDrawer: string | null }).activeDrawer = 'property';
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    expect(store.propertyDrawerOpen).toBe(true);

    store.mountRuntime();

    expect(store.propertyDrawerOpen).toBe(false);
    expect((store as unknown as { activeDrawer: string | null }).activeDrawer).toBe(null);
  });

  it('refreshes property payload when selection changes while property drawer is open', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'mount').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'setHostMode').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'getSnapshot').mockReturnValue({
      running: false,
      mode: 'normal',
      timeStep: 0.016,
      fps: 0,
      objectCount: 2,
      particleCount: 0,
      selectedObjectId: 'obj-2',
      statusText: '就绪',
      geometryInteraction: null
    });
    vi.spyOn(SimulatorRuntime.prototype, 'buildPropertyPayload').mockReturnValue({
      title: '对象 2',
      sections: [],
      values: { charge: 2 }
    });

    (store as unknown as { activeDrawer: string | null }).activeDrawer = 'property';
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    (store as unknown as { propertyTitle: string }).propertyTitle = '对象 1';
    (store as unknown as { propertyValues: Record<string, unknown> }).propertyValues = { charge: 1 };

    store.mountRuntime();

    expect(store.selectedObjectId).toBe('obj-2');
    expect(store.propertyTitle).toBe('对象 2');
    expect(store.propertyValues).toEqual({ charge: 2 });
  });


  it('keeps detailed save validation errors in status text', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'saveScene').mockReturnValue({
      ok: false,
      error: '对象数量超限（最多 5000）'
    } as never);

    const ok = store.saveScene('oversized');

    expect(ok).toBe(false);
    expect(store.statusText).toContain('对象数量超限');
  });

  it('keeps detailed export validation errors in status text', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'exportScene').mockReturnValue({
      ok: false,
      error: '对象数量超限（最多 5000）'
    } as never);

    (store as unknown as { exportScene: () => boolean }).exportScene();

    expect(store.statusText).toContain('对象数量超限');
  });

  it('keeps detailed load validation errors in status text', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'loadScene').mockReturnValue({
      ok: false,
      error: '对象数量超限（最多 5000）'
    } as never);

    const ok = store.loadScene('oversized');

    expect(ok).toBe(false);
    expect(store.statusText).toContain('对象数量超限');
  });

  it('reports save failure when storage write throws', () => {
    const store = useSimulatorStore();
    vi.spyOn(Serializer, 'saveSceneData').mockReturnValue(false);

    const ok = store.saveScene('demo-fail');
    expect(ok).toBe(false);
    expect(store.statusText).toBe('场景 "demo-fail" 保存失败');
  });

  it('keeps detailed import validation errors in status text', async () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'importScene').mockResolvedValue({
      ok: false,
      error: '对象字段 emissionRate 超出范围（0-20000）'
    });

    const ok = await store.importScene(new File(['{}'], 'broken.json', { type: 'application/json' }));

    expect(ok).toBe(false);
    expect(store.statusText).toContain('emissionRate');
  });

  it('keeps detailed scene load validation errors in status text', () => {
    const store = useSimulatorStore();

    const result = store.loadSceneData({ objects: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('缺少版本信息');
    expect(store.statusText).toContain('缺少版本信息');
  });

  it('returns conflicting display geometry edits back to UI with detailed message', () => {
    const store = useSimulatorStore();
    vi.spyOn(SimulatorRuntime.prototype, 'applySelectedProperties').mockImplementation(() => {
      throw new Error('显示尺寸存在冲突：宽度（显示）、高度（显示）推导出的缩放不一致');
    });

    const result = store.applyPropertyValues({ width__display: '300', height__display: '300' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain('显示尺寸存在冲突');
    expect(store.statusText).toContain('显示尺寸存在冲突');
  });

  it('syncs and clears geometry interaction overlay from runtime snapshot payload', () => {
    const store = useSimulatorStore();
    const mountSpy = vi.spyOn(SimulatorRuntime.prototype, 'mount').mockImplementation(() => {});
    const unmountSpy = vi.spyOn(SimulatorRuntime.prototype, 'unmount').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'setHostMode').mockImplementation(() => {});
    vi.spyOn(SimulatorRuntime.prototype, 'getSnapshot')
      .mockReturnValueOnce({
        running: false,
        mode: 'normal',
        timeStep: 0.016,
        fps: 0,
        objectCount: 1,
        particleCount: 0,
        selectedObjectId: 'obj-geo-1',
        statusText: '就绪',
        geometryInteraction: {
          objectId: 'obj-geo-1',
          sourceKey: 'radius',
          realValue: 1.2,
          displayValue: 72,
          objectScale: 1.5
        }
      })
      .mockReturnValueOnce({
        running: false,
        mode: 'normal',
        timeStep: 0.016,
        fps: 0,
        objectCount: 1,
        particleCount: 0,
        selectedObjectId: 'obj-geo-1',
        statusText: '就绪',
        geometryInteraction: null
      });

    store.mountRuntime();
    expect(store.geometryInteraction).toEqual({
      objectId: 'obj-geo-1',
      sourceKey: 'radius',
      realValue: 1.2,
      displayValue: 72,
      objectScale: 1.5
    });

    store.unmountRuntime();
    store.mountRuntime();
    expect(store.geometryInteraction).toBe(null);
    expect(mountSpy).toHaveBeenCalledTimes(2);
    expect(unmountSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps recent phone geometry edits by source key and drops incompatible history', () => {
    const store = useSimulatorStore();
    (store as unknown as { propertySections: unknown[] }).propertySections = [
      {
        fields: [
          { key: 'radius', sourceKey: 'radius', geometryRole: 'real', type: 'number' },
          { key: 'radius__display', sourceKey: 'radius', geometryRole: 'display', type: 'number' },
          { key: 'width', sourceKey: 'width', geometryRole: 'real', type: 'number' },
          { key: 'width__display', sourceKey: 'width', geometryRole: 'display', type: 'number' }
        ]
      }
    ];

    store.rememberPhoneGeometryEdit('radius__display');
    store.rememberPhoneGeometryEdit('width');
    expect(store.phoneRecentGeometrySourceKeys).toEqual(['width', 'radius']);

    (store as unknown as { propertySections: unknown[] }).propertySections = [
      {
        fields: [
          { key: 'length', sourceKey: 'length', geometryRole: 'real', type: 'number' },
          { key: 'length__display', sourceKey: 'length', geometryRole: 'display', type: 'number' }
        ]
      }
    ];

    store.rememberPhoneGeometryEdit('length__display');
    expect(store.phoneRecentGeometrySourceKeys).toEqual(['length']);
  });
});
