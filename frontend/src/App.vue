<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AuthoringPanels from './components/AuthoringPanels.vue';
import CanvasViewport from './components/CanvasViewport.vue';
import DesktopToolbarSidebar from './components/DesktopToolbarSidebar.vue';
import HeaderActionButtons from './components/HeaderActionButtons.vue';
import HeaderStatusAndSettings from './components/HeaderStatusAndSettings.vue';
import ObjectActionBar from './components/ObjectActionBar.vue';
import PhoneAuthoringSheets from './components/PhoneAuthoringSheets.vue';
import PhoneBottomNav from './components/PhoneBottomNav.vue';
import SelectionContextMenu from './components/SelectionContextMenu.vue';
import { useAppActions } from './modes/useAppActions';
import { useAppUiState } from './modes/useAppUiState';
import { usePhoneSheets } from './modes/usePhoneSheets';
import { useViewportLayout } from './modes/useViewportLayout';
import { useSimulatorStore } from './stores/simulatorStore';

const simulatorStore = useSimulatorStore();
const importFileInput = ref<HTMLInputElement | null>(null);
const {
  phoneActiveSheet,
  showAuthoringControls,
  isPhoneLayout,
  phoneAddSheetOpen,
  phoneSelectedSheetOpen,
  phoneSceneSheetOpen,
  phoneMoreSheetOpen,
  phoneAnySheetOpen,
  closePhoneSheets,
  setPhoneActiveSheet
} = usePhoneSheets(simulatorStore);
const { isCoarsePointer, mountViewportLayout, unmountViewportLayout } = useViewportLayout({
  setLayoutMode: (mode) => simulatorStore.setLayoutMode(mode)
});
const {
  phoneSelectedScale,
  phoneSelectedGeometryRows,
  propertyDrawerModel,
  markdownBoardModel,
  variablesPanelModel,
  showObjectActionBar,
  showPhoneBottomNav,
  phoneDensityClass
} = useAppUiState({
  simulatorStore,
  showAuthoringControls,
  isPhoneLayout,
  phoneAnySheetOpen,
  isCoarsePointer
});
const {
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
} = useAppActions({
  simulatorStore,
  isPhoneLayout,
  closePhoneSheets,
  importFileInput
});

onMounted(async () => {
  mountViewportLayout();
  if (import.meta.env.MODE !== 'test') {
    await nextTick();
    simulatorStore.mountRuntime();
  }
});

onBeforeUnmount(() => {
  unmountViewportLayout();
  if (import.meta.env.MODE !== 'test') {
    simulatorStore.unmountRuntime();
  }
});
</script>

<template>
  <div
    id="app"
    data-testid="app-shell"
    :class="{
      'panel-open': simulatorStore.propertyDrawerOpen,
      'view-mode': simulatorStore.viewMode,
      'layout-desktop': simulatorStore.layoutMode === 'desktop',
      'layout-tablet': simulatorStore.layoutMode === 'tablet',
      'layout-phone': simulatorStore.layoutMode === 'phone',
      'classroom-mode': simulatorStore.classroomMode,
      'phone-toolbar-open': phoneAddSheetOpen,
      'phone-settings-open': phoneSceneSheetOpen,
      'phone-secondary-open': phoneMoreSheetOpen,
      'phone-selected-open': phoneSelectedSheetOpen,
      [phoneDensityClass]: true
    }"
  >
    <header id="header">
      <h1>⚡ 电磁场粒子运动模拟器</h1>
      <div class="header-controls">
        <HeaderActionButtons
          :is-phone-layout="isPhoneLayout"
          :show-authoring-controls="showAuthoringControls"
          :running="simulatorStore.running"
          :classroom-mode="simulatorStore.classroomMode"
          :variables-panel-open="simulatorStore.variablesPanelOpen"
          :markdown-board-open="simulatorStore.markdownBoardOpen"
          :demo-mode="simulatorStore.demoMode"
          :demo-button-title="simulatorStore.demoButtonTitle"
          :demo-button-label="simulatorStore.demoButtonLabel"
          @toggle-play="togglePlayPause"
          @toggle-classroom="simulatorStore.toggleClassroomMode"
          @reset-scene="resetScene"
          @clear-scene="clearScene"
          @save-scene="saveScene"
          @load-scene="loadScene"
          @export-scene="exportScene"
          @open-import="openImportDialog"
          @toggle-theme="toggleTheme"
          @open-variables="openVariablesPanel"
          @toggle-markdown="toggleMarkdownBoard"
          @toggle-demo="toggleDemoMode"
        />
        <input
          id="import-file-input"
          ref="importFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleImportChange"
        />
        <HeaderStatusAndSettings
          :is-phone-layout="isPhoneLayout"
          :show-authoring-controls="showAuthoringControls"
          :status-text="simulatorStore.statusText"
          :object-count="simulatorStore.objectCount"
          :particle-count="simulatorStore.particleCount"
          :show-energy-overlay="simulatorStore.showEnergyOverlay"
          :pixels-per-meter="simulatorStore.pixelsPerMeter"
          :gravity="simulatorStore.gravity"
          :boundary-mode="simulatorStore.boundaryMode"
          :show-boundary-margin-control="simulatorStore.showBoundaryMarginControl"
          :boundary-margin="simulatorStore.boundaryMargin"
          :time-step="simulatorStore.timeStep"
          :time-step-label="simulatorStore.timeStepLabel"
          :demo-mode="simulatorStore.demoMode"
          @set-show-energy="setShowEnergy"
          @set-pixels-per-meter="setPixelsPerMeter"
          @set-gravity="setGravity"
          @set-boundary-mode="setBoundaryMode"
          @set-boundary-margin="setBoundaryMargin"
          @set-time-step="setTimeStep"
        />
      </div>
    </header>

    <DesktopToolbarSidebar
      v-if="showAuthoringControls && !isPhoneLayout"
      :groups="simulatorStore.toolbarGroups"
      @create="createObjectFromToolbar"
      @load-preset="loadPresetAndClose"
    />
    <PhoneAuthoringSheets
      :show-authoring-controls="showAuthoringControls"
      :is-phone-layout="isPhoneLayout"
      :phone-add-sheet-open="phoneAddSheetOpen"
      :phone-selected-sheet-open="phoneSelectedSheetOpen"
      :phone-scene-sheet-open="phoneSceneSheetOpen"
      :phone-more-sheet-open="phoneMoreSheetOpen"
      :phone-any-sheet-open="phoneAnySheetOpen"
      :toolbar-groups="simulatorStore.toolbarGroups"
      :selected-object-id="simulatorStore.selectedObjectId"
      :property-title="simulatorStore.propertyTitle || '选中对象'"
      :phone-selected-scale="phoneSelectedScale"
      :phone-selected-geometry-rows="phoneSelectedGeometryRows"
      :show-energy-overlay="simulatorStore.showEnergyOverlay"
      :pixels-per-meter="simulatorStore.pixelsPerMeter"
      :gravity="simulatorStore.gravity"
      :boundary-mode="simulatorStore.boundaryMode"
      :show-boundary-margin-control="simulatorStore.showBoundaryMarginControl"
      :boundary-margin="simulatorStore.boundaryMargin"
      :time-step="simulatorStore.timeStep"
      :time-step-label="simulatorStore.timeStepLabel"
      :demo-mode="simulatorStore.demoMode"
      @close="closePhoneSheets"
      @create-object="createObjectFromToolbar"
      @load-preset="loadPresetAndClose"
      @open-selected-properties="openSelectedPropertiesFromPhoneSheet"
      @duplicate-selected="duplicateSelectedFromPhoneSheet"
      @delete-selected="deleteSelectedFromPhoneSheet"
      @update-phone-selected-value="applyPhoneSelectedQuickValue"
      @set-show-energy="setShowEnergy"
      @set-pixels-per-meter="setPixelsPerMeter"
      @set-gravity="setGravity"
      @set-boundary-mode="setBoundaryMode"
      @set-boundary-margin="setBoundaryMargin"
      @set-time-step="setTimeStep"
      @export-scene="exportSceneFromPhoneMore"
      @open-import="openImportDialogFromPhoneMore"
      @toggle-theme="toggleThemeFromPhoneMore"
      @save-scene="saveSceneFromPhoneMore"
      @load-scene="loadSceneFromPhoneMore"
      @clear-scene="clearSceneFromPhoneMore"
      @open-variables="openVariablesPanelFromPhoneMore"
      @toggle-markdown="toggleMarkdownBoardFromPhoneMore"
    />

    <CanvasViewport :fps="simulatorStore.fps" />
    <ObjectActionBar
      v-if="showObjectActionBar"
      @open-properties="openSelectedPropertiesFromActionBar"
      @duplicate="duplicateSelectedFromActionBar"
      @delete="deleteSelectedFromActionBar"
    />

    <AuthoringPanels
      :show-authoring-controls="showAuthoringControls"
      :property-drawer-model="propertyDrawerModel"
      :property-title="simulatorStore.propertyTitle"
      :layout-mode="simulatorStore.layoutMode"
      :property-sections="simulatorStore.propertySections"
      :property-values="simulatorStore.propertyValues"
      :density-mode="simulatorStore.phoneDensityMode"
      :markdown-board-model="markdownBoardModel"
      :markdown-content="simulatorStore.markdownContent"
      :markdown-mode="simulatorStore.markdownMode"
      :markdown-font-size="simulatorStore.markdownFontSize"
      :variables-panel-model="variablesPanelModel"
      :variable-draft="simulatorStore.variableDraft"
      @update:property-drawer-model="propertyDrawerModel = $event"
      @toggle-density="simulatorStore.togglePhoneDensityMode"
      @apply-properties="applyProperties"
      @update:markdown-board-model="markdownBoardModel = $event"
      @update:markdown-content="simulatorStore.setMarkdownContent"
      @update:markdown-mode="simulatorStore.setMarkdownMode"
      @update:markdown-font-size="simulatorStore.setMarkdownFontSize"
      @update:variables-panel-model="variablesPanelModel = $event"
      @apply-variables="applyVariables"
    />

    <PhoneBottomNav
      v-if="showPhoneBottomNav"
      :model-value="phoneActiveSheet"
      :running="simulatorStore.running"
      :has-selection="!!simulatorStore.selectedObjectId"
      @toggle-play="togglePlayPauseFromPhoneNav"
      @update:modelValue="setPhoneActiveSheet"
    />

    <footer id="footer">
      <span id="status-text">{{ simulatorStore.statusText }}</span>
      <span id="object-count">对象: {{ simulatorStore.objectCount }}</span>
      <span id="particle-count">粒子: {{ simulatorStore.particleCount }}</span>
    </footer>

    <SelectionContextMenu
      v-if="showAuthoringControls"
      @open-properties="openSelectedProperties"
      @duplicate="duplicateSelected"
      @delete="deleteSelected"
    />
  </div>
</template>
