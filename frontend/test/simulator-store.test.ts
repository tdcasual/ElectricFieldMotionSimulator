import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Serializer } from '../src/engine/legacyBridge';
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

  it('reports save failure when storage write throws', () => {
    const store = useSimulatorStore();
    vi.spyOn(Serializer, 'saveSceneData').mockReturnValue(false);

    const ok = store.saveScene('demo-fail');
    expect(ok).toBe(false);
    expect(store.statusText).toBe('场景 "demo-fail" 保存失败');
  });
});
