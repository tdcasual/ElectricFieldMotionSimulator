import type { Ref } from 'vue';

type BoundaryMode = 'margin' | 'remove' | 'bounce' | 'wrap';

type ApplyPropertyResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

type AppActionStore = {
  toggleRunning: () => void;
  toggleDemoMode: () => void;
  toggleMarkdownBoard: () => void;
  resetScene: () => void;
  clearScene: () => void;
  saveScene: (name: string) => boolean;
  loadScene: (name: string) => boolean;
  exportScene: () => void;
  importScene: (file: File) => Promise<boolean>;
  toggleTheme: () => void;
  setShowEnergyOverlay: (enabled: boolean) => void;
  setPixelsPerMeter: (value: number) => void;
  setGravity: (value: number) => void;
  setBoundaryMode: (mode: BoundaryMode) => void;
  setBoundaryMargin: (value: number) => void;
  setTimeStep: (value: number) => void;
  loadPreset: (name: string) => void;
  openPropertyPanel: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  applyPropertyValues: (values: Record<string, unknown>) => ApplyPropertyResult;
  openVariablesPanel: () => void;
  applyVariables: (values: Record<string, number>) => void;
  refreshSelectedPropertyPayload: () => boolean;
  createObjectAtCenter: (type: string) => void;
};

type UseAppActionsOptions = {
  simulatorStore: AppActionStore;
  isPhoneLayout: Ref<boolean>;
  closePhoneSheets: () => void;
  importFileInput: Ref<HTMLInputElement | null>;
};

export function useAppActions(options: UseAppActionsOptions) {
  const { simulatorStore, isPhoneLayout, closePhoneSheets, importFileInput } = options;

  function togglePlayPause() {
    simulatorStore.toggleRunning();
  }

  function togglePlayPauseFromPhoneNav() {
    togglePlayPause();
    closePhoneSheets();
  }

  function toggleDemoMode() {
    simulatorStore.toggleDemoMode();
  }

  function toggleMarkdownBoard() {
    simulatorStore.toggleMarkdownBoard();
  }

  function resetScene() {
    simulatorStore.resetScene();
  }

  function clearScene() {
    if (!window.confirm('确定要清空整个场景吗？此操作不可撤销。')) return false;
    simulatorStore.clearScene();
    return true;
  }

  function saveScene() {
    const sceneName = window.prompt('请输入场景名称:', 'my-scene');
    if (!sceneName) return false;
    return simulatorStore.saveScene(sceneName);
  }

  function loadScene() {
    const sceneName = window.prompt('请输入要加载的场景名称:', 'my-scene');
    if (!sceneName) return false;
    return simulatorStore.loadScene(sceneName);
  }

  function exportScene() {
    simulatorStore.exportScene();
  }

  function openImportDialog() {
    importFileInput.value?.click();
  }

  async function handleImportChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await simulatorStore.importScene(file);
    }
    input.value = '';
  }

  function toggleTheme() {
    simulatorStore.toggleTheme();
  }

  function setShowEnergy(event: Event) {
    const target = event.target as HTMLInputElement;
    simulatorStore.setShowEnergyOverlay(target.checked);
  }

  function setPixelsPerMeter(event: Event) {
    const target = event.target as HTMLInputElement;
    simulatorStore.setPixelsPerMeter(Number(target.value));
  }

  function setGravity(event: Event) {
    const target = event.target as HTMLInputElement;
    simulatorStore.setGravity(Number(target.value));
  }

  function setBoundaryMode(event: Event) {
    const target = event.target as HTMLSelectElement;
    simulatorStore.setBoundaryMode(target.value as BoundaryMode);
  }

  function setBoundaryMargin(event: Event) {
    const target = event.target as HTMLInputElement;
    simulatorStore.setBoundaryMargin(Number(target.value));
  }

  function setTimeStep(event: Event) {
    const target = event.target as HTMLInputElement;
    simulatorStore.setTimeStep(Number(target.value));
  }

  function loadPreset(name: string) {
    simulatorStore.loadPreset(name);
  }

  function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (!contextMenu) return;
    contextMenu.style.display = 'none';
  }

  function openSelectedProperties() {
    simulatorStore.openPropertyPanel();
    hideContextMenu();
  }

  function duplicateSelected() {
    simulatorStore.duplicateSelected();
    hideContextMenu();
  }

  function deleteSelected() {
    simulatorStore.deleteSelected();
    hideContextMenu();
  }

  function applyPropertyValues(values: Record<string, unknown>) {
    const result = simulatorStore.applyPropertyValues(values);
    if (!result.ok && import.meta.env.MODE !== 'test') {
      window.alert(result.error);
    }
    return result.ok;
  }

  function applyProperties(values: Record<string, unknown>) {
    applyPropertyValues(values);
  }

  function openVariablesPanel() {
    simulatorStore.openVariablesPanel();
  }

  function applyVariables(values: Record<string, number>) {
    simulatorStore.applyVariables(values);
  }

  function applyPhoneSelectedQuickValue(payload: { key: string; value: string }) {
    if (!payload?.key) return;
    applyPropertyValues({ [payload.key]: payload.value });
    simulatorStore.refreshSelectedPropertyPayload();
  }

  function createObjectFromToolbar(type: string) {
    simulatorStore.createObjectAtCenter(type);
    if (isPhoneLayout.value) {
      closePhoneSheets();
    }
  }

  function loadPresetAndClose(name: string) {
    loadPreset(name);
    if (isPhoneLayout.value) {
      closePhoneSheets();
    }
  }

  function exportSceneFromPhoneMore() {
    exportScene();
    closePhoneSheets();
  }

  function openImportDialogFromPhoneMore() {
    openImportDialog();
    closePhoneSheets();
  }

  function toggleThemeFromPhoneMore() {
    toggleTheme();
    closePhoneSheets();
  }

  function saveSceneFromPhoneMore() {
    if (saveScene()) closePhoneSheets();
  }

  function loadSceneFromPhoneMore() {
    if (loadScene()) closePhoneSheets();
  }

  function clearSceneFromPhoneMore() {
    if (clearScene()) closePhoneSheets();
  }

  function openVariablesPanelFromPhoneMore() {
    openVariablesPanel();
    closePhoneSheets();
  }

  function toggleMarkdownBoardFromPhoneMore() {
    toggleMarkdownBoard();
    closePhoneSheets();
  }

  function openSelectedPropertiesFromPhoneSheet() {
    simulatorStore.openPropertyPanel();
    closePhoneSheets();
  }

  function duplicateSelectedFromPhoneSheet() {
    simulatorStore.duplicateSelected();
  }

  function confirmDeleteSelected() {
    try {
      return window.confirm('确定删除当前选中对象吗？此操作不可撤销。');
    } catch {
      return true;
    }
  }

  function deleteSelectedFromPhoneSheet() {
    if (!confirmDeleteSelected()) return;
    simulatorStore.deleteSelected();
    closePhoneSheets();
  }

  function openSelectedPropertiesFromActionBar() {
    simulatorStore.openPropertyPanel();
  }

  function duplicateSelectedFromActionBar() {
    simulatorStore.duplicateSelected();
  }

  function deleteSelectedFromActionBar() {
    if (!confirmDeleteSelected()) return;
    simulatorStore.deleteSelected();
  }

  return {
    togglePlayPause,
    togglePlayPauseFromPhoneNav,
    toggleDemoMode,
    toggleMarkdownBoard,
    resetScene,
    clearScene,
    saveScene,
    loadScene,
    exportScene,
    openImportDialog,
    handleImportChange,
    toggleTheme,
    setShowEnergy,
    setPixelsPerMeter,
    setGravity,
    setBoundaryMode,
    setBoundaryMargin,
    setTimeStep,
    loadPreset,
    openSelectedProperties,
    duplicateSelected,
    deleteSelected,
    applyProperties,
    openVariablesPanel,
    applyVariables,
    applyPhoneSelectedQuickValue,
    createObjectFromToolbar,
    loadPresetAndClose,
    exportSceneFromPhoneMore,
    openImportDialogFromPhoneMore,
    toggleThemeFromPhoneMore,
    saveSceneFromPhoneMore,
    loadSceneFromPhoneMore,
    clearSceneFromPhoneMore,
    openVariablesPanelFromPhoneMore,
    toggleMarkdownBoardFromPhoneMore,
    openSelectedPropertiesFromPhoneSheet,
    duplicateSelectedFromPhoneSheet,
    deleteSelectedFromPhoneSheet,
    openSelectedPropertiesFromActionBar,
    duplicateSelectedFromActionBar,
    deleteSelectedFromActionBar
  };
}
