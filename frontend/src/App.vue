<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import CanvasViewport from './components/CanvasViewport.vue';
import DesktopToolbarSidebar from './components/DesktopToolbarSidebar.vue';
import HeaderActionButtons from './components/HeaderActionButtons.vue';
import HeaderStatusAndSettings from './components/HeaderStatusAndSettings.vue';
import MarkdownBoard from './components/MarkdownBoard.vue';
import ObjectActionBar from './components/ObjectActionBar.vue';
import PhoneAddSheet from './components/PhoneAddSheet.vue';
import PhoneBottomNav from './components/PhoneBottomNav.vue';
import PhoneMoreSheet from './components/PhoneMoreSheet.vue';
import PhoneSceneSheet from './components/PhoneSceneSheet.vue';
import PhoneSelectedSheet from './components/PhoneSelectedSheet.vue';
import PropertyDrawer from './components/PropertyDrawer.vue';
import SelectionContextMenu from './components/SelectionContextMenu.vue';
import VariablesPanel from './components/VariablesPanel.vue';
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
    <PhoneAddSheet
      v-if="showAuthoringControls && isPhoneLayout && phoneAddSheetOpen"
      :groups="simulatorStore.toolbarGroups"
      @close="closePhoneSheets"
      @create="createObjectFromToolbar"
      @load-preset="loadPresetAndClose"
    />
    <PhoneSelectedSheet
      v-if="showAuthoringControls && isPhoneLayout && phoneSelectedSheetOpen"
      :selected-object-id="simulatorStore.selectedObjectId"
      :title="simulatorStore.propertyTitle || '选中对象'"
      :object-scale="phoneSelectedScale"
      :geometry-rows="phoneSelectedGeometryRows"
      @close="closePhoneSheets"
      @open-properties="openSelectedPropertiesFromPhoneSheet"
      @duplicate="duplicateSelectedFromPhoneSheet"
      @delete="deleteSelectedFromPhoneSheet"
      @update-value="applyPhoneSelectedQuickValue"
    />
    <PhoneSceneSheet
      v-if="showAuthoringControls && isPhoneLayout && phoneSceneSheetOpen"
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
      @set-show-energy="setShowEnergy"
      @set-pixels-per-meter="setPixelsPerMeter"
      @set-gravity="setGravity"
      @set-boundary-mode="setBoundaryMode"
      @set-boundary-margin="setBoundaryMargin"
      @set-time-step="setTimeStep"
    />
    <PhoneMoreSheet
      v-if="showAuthoringControls && isPhoneLayout && phoneMoreSheetOpen"
      @close="closePhoneSheets"
      @export-scene="exportSceneFromPhoneMore"
      @open-import="openImportDialogFromPhoneMore"
      @toggle-theme="toggleThemeFromPhoneMore"
      @save-scene="saveSceneFromPhoneMore"
      @load-scene="loadSceneFromPhoneMore"
      @clear-scene="clearSceneFromPhoneMore"
      @open-variables="openVariablesPanelFromPhoneMore"
      @toggle-markdown="toggleMarkdownBoardFromPhoneMore"
    />
    <button
      v-if="showAuthoringControls && isPhoneLayout && phoneAnySheetOpen"
      type="button"
      class="phone-sheet-backdrop"
      aria-label="关闭手机面板"
      @click="closePhoneSheets"
    ></button>

    <CanvasViewport :fps="simulatorStore.fps" />
    <ObjectActionBar
      v-if="showObjectActionBar"
      @open-properties="openSelectedPropertiesFromActionBar"
      @duplicate="duplicateSelectedFromActionBar"
      @delete="deleteSelectedFromActionBar"
    />

    <PropertyDrawer
      v-if="showAuthoringControls"
      v-model="propertyDrawerModel"
      :title="simulatorStore.propertyTitle"
      :layout-mode="simulatorStore.layoutMode"
      :sections="simulatorStore.propertySections"
      :values="simulatorStore.propertyValues"
      :density-mode="simulatorStore.phoneDensityMode"
      @toggle-density="simulatorStore.togglePhoneDensityMode"
      @apply="applyProperties"
    />
    <MarkdownBoard
      v-if="showAuthoringControls"
      v-model="markdownBoardModel"
      :layout-mode="simulatorStore.layoutMode"
      :content="simulatorStore.markdownContent"
      :mode="simulatorStore.markdownMode"
      :font-size="simulatorStore.markdownFontSize"
      @update:content="simulatorStore.setMarkdownContent"
      @update:mode="simulatorStore.setMarkdownMode"
      @update:fontSize="simulatorStore.setMarkdownFontSize"
    />
    <VariablesPanel
      v-if="showAuthoringControls"
      v-model="variablesPanelModel"
      :layout-mode="simulatorStore.layoutMode"
      :variables="simulatorStore.variableDraft"
      @apply="applyVariables"
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
