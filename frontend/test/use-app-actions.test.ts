import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppActions } from '../src/modes/useAppActions';

function createStore() {
  return {
    toggleRunning: vi.fn(),
    toggleDemoMode: vi.fn(),
    toggleMarkdownBoard: vi.fn(),
    resetScene: vi.fn(),
    clearScene: vi.fn(),
    saveScene: vi.fn().mockReturnValue(true),
    loadScene: vi.fn().mockReturnValue(true),
    exportScene: vi.fn(),
    importScene: vi.fn().mockResolvedValue(true),
    toggleTheme: vi.fn(),
    setShowEnergyOverlay: vi.fn(),
    setPixelsPerMeter: vi.fn(),
    setGravity: vi.fn(),
    setBoundaryMode: vi.fn(),
    setBoundaryMargin: vi.fn(),
    setTimeStep: vi.fn(),
    loadPreset: vi.fn(),
    openPropertyPanel: vi.fn(),
    duplicateSelected: vi.fn(),
    deleteSelected: vi.fn(),
    applyPropertyValues: vi.fn().mockReturnValue({ ok: true as const }),
    openVariablesPanel: vi.fn(),
    applyVariables: vi.fn(),
    refreshSelectedPropertyPayload: vi.fn().mockReturnValue(true),
    rememberPhoneGeometryEdit: vi.fn(),
    createObjectAtCenter: vi.fn()
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useAppActions', () => {
  it('closes phone sheets after creating an object only in phone layout', () => {
    const simulatorStore = createStore();
    const closePhoneSheets = vi.fn();
    const isPhoneLayout = ref(true);

    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets,
      isPhoneLayout,
      importFileInput: ref(null)
    });

    actions.createObjectFromToolbar('particle');
    expect(simulatorStore.createObjectAtCenter).toHaveBeenCalledWith('particle');
    expect(closePhoneSheets).toHaveBeenCalledTimes(1);

    closePhoneSheets.mockClear();
    isPhoneLayout.value = false;
    actions.createObjectFromToolbar('particle');
    expect(closePhoneSheets).not.toHaveBeenCalled();
  });

  it('only closes phone more sheet when save succeeds', () => {
    const simulatorStore = createStore();
    const closePhoneSheets = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('scene-1');

    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets,
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    simulatorStore.saveScene.mockReturnValueOnce(true);
    actions.saveSceneFromPhoneMore();
    expect(simulatorStore.saveScene).toHaveBeenCalledWith('scene-1');
    expect(closePhoneSheets).toHaveBeenCalledTimes(1);

    closePhoneSheets.mockClear();
    promptSpy.mockReturnValueOnce('scene-2');
    simulatorStore.saveScene.mockReturnValueOnce(false);
    actions.saveSceneFromPhoneMore();
    expect(closePhoneSheets).not.toHaveBeenCalled();

    closePhoneSheets.mockClear();
    promptSpy.mockReturnValueOnce(null);
    actions.saveSceneFromPhoneMore();
    expect(closePhoneSheets).not.toHaveBeenCalled();
  });

  it('requires confirmation before deleting from phone sheet', () => {
    const simulatorStore = createStore();
    const closePhoneSheets = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets,
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    actions.deleteSelectedFromPhoneSheet();
    expect(simulatorStore.deleteSelected).not.toHaveBeenCalled();
    expect(closePhoneSheets).not.toHaveBeenCalled();

    confirmSpy.mockReturnValue(true);
    actions.deleteSelectedFromPhoneSheet();
    expect(simulatorStore.deleteSelected).toHaveBeenCalledTimes(1);
    expect(closePhoneSheets).toHaveBeenCalledTimes(1);
  });

  it('imports selected file and clears input value', async () => {
    const simulatorStore = createStore();

    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets: vi.fn(),
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    const file = new File(['{}'], 'scene.json', { type: 'application/json' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file]
    });

    await actions.handleImportChange({ target: input } as unknown as Event);
    expect(simulatorStore.importScene).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('hides context menu after context actions', () => {
    const simulatorStore = createStore();

    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets: vi.fn(),
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    const menu = document.createElement('div');
    menu.id = 'context-menu';
    menu.style.display = 'block';
    document.body.appendChild(menu);

    actions.openSelectedProperties();
    expect(simulatorStore.openPropertyPanel).toHaveBeenCalledTimes(1);
    expect(menu.style.display).toBe('none');

    menu.style.display = 'block';
    actions.duplicateSelected();
    expect(simulatorStore.duplicateSelected).toHaveBeenCalledTimes(1);
    expect(menu.style.display).toBe('none');

    menu.style.display = 'block';
    actions.deleteSelected();
    expect(simulatorStore.deleteSelected).toHaveBeenCalledTimes(1);
    expect(menu.style.display).toBe('none');
  });

  it('records recent geometry key after successful phone quick edit', () => {
    const simulatorStore = createStore();
    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets: vi.fn(),
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    actions.applyPhoneSelectedQuickValue({ key: 'radius__display', value: '120' });

    expect(simulatorStore.applyPropertyValues).toHaveBeenCalledWith({ radius__display: '120' });
    expect(simulatorStore.rememberPhoneGeometryEdit).toHaveBeenCalledWith('radius__display');
    expect(simulatorStore.refreshSelectedPropertyPayload).toHaveBeenCalledTimes(1);
  });

  it('does not record recent geometry key when quick edit apply fails', () => {
    const simulatorStore = createStore();
    simulatorStore.applyPropertyValues.mockReturnValueOnce({ ok: false as const, error: 'bad value' });
    const actions = useAppActions({
      simulatorStore,
      closePhoneSheets: vi.fn(),
      isPhoneLayout: ref(true),
      importFileInput: ref(null)
    });

    actions.applyPhoneSelectedQuickValue({ key: 'radius', value: 'x' });

    expect(simulatorStore.rememberPhoneGeometryEdit).not.toHaveBeenCalled();
    expect(simulatorStore.refreshSelectedPropertyPayload).not.toHaveBeenCalled();
  });
});
