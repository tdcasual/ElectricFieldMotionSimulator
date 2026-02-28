import { computed, type Ref } from 'vue';
import { buildPhoneGeometryRows, type GeometrySectionLike, type PhoneGeometryRow } from './phoneGeometry';

type LayoutMode = 'desktop' | 'tablet' | 'phone';

type AppUiStateStore = {
  propertyValues: Record<string, unknown>;
  propertySections: unknown[];
  propertyDrawerOpen: boolean;
  markdownBoardOpen: boolean;
  variablesPanelOpen: boolean;
  selectedObjectId: string | null;
  activeDrawer: string | null;
  layoutMode: LayoutMode;
  phoneDensityMode: 'compact' | 'comfortable';
  openPropertyPanel: () => void;
  closePropertyPanel: () => void;
  closeMarkdownBoard: () => void;
  toggleMarkdownBoard: () => void;
  openVariablesPanel: () => void;
  closeVariablesPanel: () => void;
};

type UseAppUiStateOptions = {
  simulatorStore: AppUiStateStore;
  showAuthoringControls: Ref<boolean>;
  isPhoneLayout: Ref<boolean>;
  phoneAnySheetOpen: Ref<boolean>;
  isCoarsePointer: Ref<boolean>;
};

export function useAppUiState(options: UseAppUiStateOptions) {
  const { simulatorStore, showAuthoringControls, isPhoneLayout, phoneAnySheetOpen, isCoarsePointer } = options;

  const phoneSelectedScale = computed(() => {
    const raw = Number(simulatorStore.propertyValues.__geometryObjectScale);
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    return raw;
  });

  const phoneSelectedGeometryRows = computed<PhoneGeometryRow[]>(() => {
    const sections = simulatorStore.propertySections as GeometrySectionLike[];
    const values = simulatorStore.propertyValues as Record<string, unknown>;
    return buildPhoneGeometryRows(sections, values);
  });

  const propertyDrawerModel = computed({
    get: () => simulatorStore.propertyDrawerOpen,
    set: (next: boolean) => {
      if (next) {
        simulatorStore.openPropertyPanel();
      } else {
        simulatorStore.closePropertyPanel();
      }
    }
  });

  const markdownBoardModel = computed({
    get: () => simulatorStore.markdownBoardOpen,
    set: (next: boolean) => {
      if (!next) simulatorStore.closeMarkdownBoard();
      else if (!simulatorStore.markdownBoardOpen) simulatorStore.toggleMarkdownBoard();
    }
  });

  const variablesPanelModel = computed({
    get: () => simulatorStore.variablesPanelOpen,
    set: (next: boolean) => {
      if (next) {
        simulatorStore.openVariablesPanel();
      } else {
        simulatorStore.closeVariablesPanel();
      }
    }
  });

  const showObjectActionBar = computed(() => {
    if (!showAuthoringControls.value) return false;
    if (!simulatorStore.selectedObjectId) return false;
    if (simulatorStore.activeDrawer !== null) return false;
    if (isPhoneLayout.value && phoneAnySheetOpen.value) return false;
    return simulatorStore.layoutMode === 'phone' || isCoarsePointer.value;
  });

  const showPhoneBottomNav = computed(() => {
    if (!showAuthoringControls.value) return false;
    if (!isPhoneLayout.value) return false;
    return simulatorStore.activeDrawer === null;
  });

  const phoneDensityClass = computed(() =>
    simulatorStore.phoneDensityMode === 'comfortable' ? 'phone-density-comfortable' : 'phone-density-compact'
  );

  return {
    phoneSelectedScale,
    phoneSelectedGeometryRows,
    propertyDrawerModel,
    markdownBoardModel,
    variablesPanelModel,
    showObjectActionBar,
    showPhoneBottomNav,
    phoneDensityClass
  };
}
