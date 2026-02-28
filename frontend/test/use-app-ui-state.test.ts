import { reactive, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useAppUiState } from '../src/modes/useAppUiState';

function createStore() {
  return reactive({
    propertyValues: {
      __geometryObjectScale: 2,
      radius: 1,
      radius__display: 60
    } as Record<string, unknown>,
    propertySections: [
      {
        fields: [
          {
            key: 'radius',
            label: '半径（真实）',
            sourceKey: 'radius',
            geometryRole: 'real'
          },
          {
            key: 'radius__display',
            label: '半径（显示）',
            sourceKey: 'radius',
            geometryRole: 'display'
          }
        ]
      }
    ],
    propertyDrawerOpen: false,
    markdownBoardOpen: false,
    variablesPanelOpen: false,
    selectedObjectId: 'obj-1' as string | null,
    activeDrawer: null as string | null,
    layoutMode: 'phone' as 'desktop' | 'tablet' | 'phone',
    phoneDensityMode: 'compact' as 'compact' | 'comfortable',
    openPropertyPanel: vi.fn(),
    closePropertyPanel: vi.fn(),
    closeMarkdownBoard: vi.fn(),
    toggleMarkdownBoard: vi.fn(),
    openVariablesPanel: vi.fn(),
    closeVariablesPanel: vi.fn()
  });
}

describe('useAppUiState', () => {
  it('builds phone geometry rows and resolves selected scale', () => {
    const simulatorStore = createStore();
    const uiState = useAppUiState({
      simulatorStore,
      showAuthoringControls: ref(true),
      isPhoneLayout: ref(true),
      phoneAnySheetOpen: ref(false),
      isCoarsePointer: ref(false)
    });

    expect(uiState.phoneSelectedScale.value).toBe(2);
    expect(uiState.phoneSelectedGeometryRows.value).toHaveLength(1);
    expect(uiState.phoneSelectedGeometryRows.value[0].sourceKey).toBe('radius');

    simulatorStore.propertyValues.__geometryObjectScale = 0;
    expect(uiState.phoneSelectedScale.value).toBe(1);
  });

  it('routes drawer/board model setters to store actions', () => {
    const simulatorStore = createStore();
    const uiState = useAppUiState({
      simulatorStore,
      showAuthoringControls: ref(true),
      isPhoneLayout: ref(true),
      phoneAnySheetOpen: ref(false),
      isCoarsePointer: ref(false)
    });

    uiState.propertyDrawerModel.value = true;
    uiState.propertyDrawerModel.value = false;
    expect(simulatorStore.openPropertyPanel).toHaveBeenCalledTimes(1);
    expect(simulatorStore.closePropertyPanel).toHaveBeenCalledTimes(1);

    uiState.markdownBoardModel.value = true;
    expect(simulatorStore.toggleMarkdownBoard).toHaveBeenCalledTimes(1);

    simulatorStore.markdownBoardOpen = true;
    uiState.markdownBoardModel.value = true;
    expect(simulatorStore.toggleMarkdownBoard).toHaveBeenCalledTimes(1);

    uiState.markdownBoardModel.value = false;
    expect(simulatorStore.closeMarkdownBoard).toHaveBeenCalledTimes(1);

    uiState.variablesPanelModel.value = true;
    uiState.variablesPanelModel.value = false;
    expect(simulatorStore.openVariablesPanel).toHaveBeenCalledTimes(1);
    expect(simulatorStore.closeVariablesPanel).toHaveBeenCalledTimes(1);
  });

  it('computes action bar and phone nav visibility from interaction state', () => {
    const simulatorStore = createStore();
    const showAuthoringControls = ref(true);
    const isPhoneLayout = ref(true);
    const phoneAnySheetOpen = ref(false);
    const isCoarsePointer = ref(false);

    const uiState = useAppUiState({
      simulatorStore,
      showAuthoringControls,
      isPhoneLayout,
      phoneAnySheetOpen,
      isCoarsePointer
    });

    expect(uiState.showObjectActionBar.value).toBe(true);
    expect(uiState.showPhoneBottomNav.value).toBe(true);

    phoneAnySheetOpen.value = true;
    expect(uiState.showObjectActionBar.value).toBe(false);

    phoneAnySheetOpen.value = false;
    simulatorStore.activeDrawer = 'property';
    expect(uiState.showObjectActionBar.value).toBe(false);
    expect(uiState.showPhoneBottomNav.value).toBe(false);

    simulatorStore.activeDrawer = null;
    simulatorStore.layoutMode = 'desktop';
    isPhoneLayout.value = false;
    expect(uiState.showObjectActionBar.value).toBe(false);

    isCoarsePointer.value = true;
    expect(uiState.showObjectActionBar.value).toBe(true);

    showAuthoringControls.value = false;
    expect(uiState.showObjectActionBar.value).toBe(false);
    expect(uiState.showPhoneBottomNav.value).toBe(false);
  });

  it('maps density class from store mode', () => {
    const simulatorStore = createStore();
    const uiState = useAppUiState({
      simulatorStore,
      showAuthoringControls: ref(true),
      isPhoneLayout: ref(true),
      phoneAnySheetOpen: ref(false),
      isCoarsePointer: ref(false)
    });

    expect(uiState.phoneDensityClass.value).toBe('phone-density-compact');
    simulatorStore.phoneDensityMode = 'comfortable';
    expect(uiState.phoneDensityClass.value).toBe('phone-density-comfortable');
  });
});
