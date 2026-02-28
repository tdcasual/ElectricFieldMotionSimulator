<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import AuthoringPanels from './components/AuthoringPanels.vue';
import AppStatusFooter from './components/AppStatusFooter.vue';
import CanvasViewport from './components/CanvasViewport.vue';
import DesktopToolbarSidebar from './components/DesktopToolbarSidebar.vue';
import HeaderActionButtons from './components/HeaderActionButtons.vue';
import HeaderStatusAndSettings from './components/HeaderStatusAndSettings.vue';
import ObjectActionBar from './components/ObjectActionBar.vue';
import PhoneAuthoringSheets from './components/PhoneAuthoringSheets.vue';
import PhoneBottomNav from './components/PhoneBottomNav.vue';
import SelectionContextMenu from './components/SelectionContextMenu.vue';
import { useAppActions } from './modes/useAppActions';
import { useAppShellClass } from './modes/useAppShellClass';
import { useAppUiState } from './modes/useAppUiState';
import { usePhoneSheets } from './modes/usePhoneSheets';
import { useViewportLayout } from './modes/useViewportLayout';
import { useSimulatorStore } from './stores/simulatorStore';

const simulatorStore = useSimulatorStore();
const importFileInput = ref<HTMLInputElement | null>(null);
const { phoneActiveSheet, showAuthoringControls, isPhoneLayout, phoneAddSheetOpen, phoneSelectedSheetOpen, phoneSceneSheetOpen, phoneMoreSheetOpen, phoneAnySheetOpen, closePhoneSheets, setPhoneActiveSheet } =
  usePhoneSheets(simulatorStore);
const { isCoarsePointer, mountViewportLayout, unmountViewportLayout } = useViewportLayout({
  setLayoutMode: (mode) => simulatorStore.setLayoutMode(mode)
});
const { phoneSelectedScale, phoneSelectedGeometryRows, propertyDrawerModel, markdownBoardModel, variablesPanelModel, showObjectActionBar, showPhoneBottomNav, phoneSheetNavigationLocked, phoneDensityClass } = useAppUiState({
  simulatorStore,
  showAuthoringControls,
  isPhoneLayout,
  phoneAnySheetOpen,
  isCoarsePointer
});
const appActions = useAppActions({
  simulatorStore,
  isPhoneLayout,
  closePhoneSheets,
  importFileInput
});
const { appShellClass } = useAppShellClass({
  simulatorStore,
  phoneAddSheetOpen,
  phoneSceneSheetOpen,
  phoneMoreSheetOpen,
  phoneSelectedSheetOpen,
  phoneDensityClass
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
  <div id="app" data-testid="app-shell" :class="appShellClass">
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
          @toggle-play="appActions.togglePlayPause"
          @toggle-classroom="simulatorStore.toggleClassroomMode"
          @reset-scene="appActions.resetScene"
          @clear-scene="appActions.clearScene"
          @save-scene="appActions.saveScene"
          @load-scene="appActions.loadScene"
          @export-scene="appActions.exportScene"
          @open-import="appActions.openImportDialog"
          @toggle-theme="appActions.toggleTheme"
          @open-variables="appActions.openVariablesPanel"
          @toggle-markdown="appActions.toggleMarkdownBoard"
          @toggle-demo="appActions.toggleDemoMode"
        />
        <input
          id="import-file-input"
          ref="importFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="appActions.handleImportChange"
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
          @set-show-energy="appActions.setShowEnergy"
          @set-pixels-per-meter="appActions.setPixelsPerMeter"
          @set-gravity="appActions.setGravity"
          @set-boundary-mode="appActions.setBoundaryMode"
          @set-boundary-margin="appActions.setBoundaryMargin"
          @set-time-step="appActions.setTimeStep"
        />
      </div>
    </header>

    <DesktopToolbarSidebar
      v-if="showAuthoringControls && !isPhoneLayout"
      :groups="simulatorStore.toolbarGroups"
      @create="appActions.createObjectFromToolbar"
      @load-preset="appActions.loadPresetAndClose"
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
      @create-object="appActions.createObjectFromToolbar"
      @load-preset="appActions.loadPresetAndClose"
      @open-selected-properties="appActions.openSelectedPropertiesFromPhoneSheet"
      @duplicate-selected="appActions.duplicateSelectedFromPhoneSheet"
      @delete-selected="appActions.deleteSelectedFromPhoneSheet"
      @update-phone-selected-value="appActions.applyPhoneSelectedQuickValue"
      @set-show-energy="appActions.setShowEnergy"
      @set-pixels-per-meter="appActions.setPixelsPerMeter"
      @set-gravity="appActions.setGravity"
      @set-boundary-mode="appActions.setBoundaryMode"
      @set-boundary-margin="appActions.setBoundaryMargin"
      @set-time-step="appActions.setTimeStep"
      @export-scene="appActions.exportSceneFromPhoneMore"
      @open-import="appActions.openImportDialogFromPhoneMore"
      @toggle-theme="appActions.toggleThemeFromPhoneMore"
      @save-scene="appActions.saveSceneFromPhoneMore"
      @load-scene="appActions.loadSceneFromPhoneMore"
      @clear-scene="appActions.clearSceneFromPhoneMore"
      @open-variables="appActions.openVariablesPanelFromPhoneMore"
      @toggle-markdown="appActions.toggleMarkdownBoardFromPhoneMore"
    />

    <CanvasViewport :fps="simulatorStore.fps" />
    <ObjectActionBar
      v-if="showObjectActionBar"
      @open-properties="appActions.openSelectedPropertiesFromActionBar"
      @duplicate="appActions.duplicateSelectedFromActionBar"
      @delete="appActions.deleteSelectedFromActionBar"
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
      @apply-properties="appActions.applyProperties"
      @update:markdown-board-model="markdownBoardModel = $event"
      @update:markdown-content="simulatorStore.setMarkdownContent"
      @update:markdown-mode="simulatorStore.setMarkdownMode"
      @update:markdown-font-size="simulatorStore.setMarkdownFontSize"
      @update:variables-panel-model="variablesPanelModel = $event"
      @apply-variables="appActions.applyVariables"
    />

    <PhoneBottomNav
      v-if="showPhoneBottomNav"
      :model-value="phoneActiveSheet"
      :running="simulatorStore.running"
      :has-selection="!!simulatorStore.selectedObjectId"
      :sheet-navigation-locked="phoneSheetNavigationLocked"
      @toggle-play="appActions.togglePlayPauseFromPhoneNav"
      @update:modelValue="setPhoneActiveSheet"
    />

    <AppStatusFooter
      :status-text="simulatorStore.statusText"
      :object-count="simulatorStore.objectCount"
      :particle-count="simulatorStore.particleCount"
    />

    <SelectionContextMenu
      v-if="showAuthoringControls"
      @open-properties="appActions.openSelectedProperties"
      @duplicate="appActions.duplicateSelected"
      @delete="appActions.deleteSelected"
    />
  </div>
</template>
