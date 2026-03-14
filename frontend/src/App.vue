<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AuthoringPanels from './components/AuthoringPanels.vue';
import AppStatusFooter from './components/AppStatusFooter.vue';
import CanvasViewport from './components/CanvasViewport.vue';
import DesktopToolbarSidebar from './components/DesktopToolbarSidebar.vue';
import GeometryOverlayBadge from './components/GeometryOverlayBadge.vue';
import HeaderActionButtons from './components/HeaderActionButtons.vue';
import HeaderModeStrip from './components/HeaderModeStrip.vue';
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
const isTabletLayout = computed(() => simulatorStore.layoutMode === 'tablet');
const useDesktopUtilityTrays = computed(() => !isPhoneLayout.value && !isTabletLayout.value && showAuthoringControls.value);
const desktopUtilityTray = ref<'scene-files' | 'scene-settings' | null>(null);
const showDesktopUtilityTray = computed(() => useDesktopUtilityTrays.value && desktopUtilityTray.value !== null);

function toggleDesktopUtilityTray(kind: 'scene-files' | 'scene-settings') {
  desktopUtilityTray.value = desktopUtilityTray.value === kind ? null : kind;
}

watch([isPhoneLayout, isTabletLayout, showAuthoringControls], ([phone, tablet, authoring]) => {
  if (phone || tablet || !authoring) {
    desktopUtilityTray.value = null;
  }
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
  <div id="app" data-testid="app-shell" :class="[appShellClass, { 'desktop-utility-tray-open': showDesktopUtilityTray }]">
    <header id="header">
      <div v-if="!isPhoneLayout" class="header-brand-block" data-testid="header-brand-block">
        <div class="header-title-stack">
          <span class="header-kicker">Field Lab</span>
          <h1>⚡ 电磁场粒子运动模拟器</h1>
        </div>
        <HeaderModeStrip
          :running="simulatorStore.running"
          :classroom-mode="simulatorStore.classroomMode"
          :demo-mode="simulatorStore.demoMode"
          :show-authoring-controls="showAuthoringControls"
          :status-text="simulatorStore.statusText"
          :object-count="simulatorStore.objectCount"
          :particle-count="simulatorStore.particleCount"
          :compact="isTabletLayout"
        />
      </div>
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
          :use-utility-tray="useDesktopUtilityTrays"
          :scene-tray-open="desktopUtilityTray === 'scene-files'"
          :settings-tray-open="desktopUtilityTray === 'scene-settings'"
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
          @toggle-scene-tray="toggleDesktopUtilityTray('scene-files')"
          @toggle-settings-tray="toggleDesktopUtilityTray('scene-settings')"
        />
        <input
          id="import-file-input"
          ref="importFileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="appActions.handleImportChange"
        />
        <div
          v-if="useDesktopUtilityTrays && desktopUtilityTray === 'scene-files'"
          class="header-settings desktop-scene-file-tray"
          data-testid="desktop-scene-file-tray"
        >
          <div class="desktop-scene-settings" data-testid="desktop-scene-file-actions">
            <button id="save-btn" class="btn btn-subtle" title="保存场景" aria-label="保存场景" @click="appActions.saveScene">💾 保存</button>
            <button id="load-btn" class="btn btn-subtle" title="加载场景" aria-label="加载场景" @click="appActions.loadScene">📂 读取</button>
            <button id="export-btn" class="btn btn-subtle" title="导出场景" aria-label="导出场景" @click="appActions.exportScene">📤 导出</button>
            <button id="import-btn" class="btn btn-subtle" title="导入场景" aria-label="导入场景" @click="appActions.openImportDialog">📥 导入</button>
            <button id="clear-btn" class="btn btn-subtle" title="清空场景" aria-label="清空场景" @click="appActions.clearScene">🗑 清空</button>
          </div>
        </div>
        <HeaderStatusAndSettings
          v-if="!useDesktopUtilityTrays || desktopUtilityTray === 'scene-settings'"
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
      :compact="isTabletLayout"
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

    <CanvasViewport
      :fps="simulatorStore.fps"
      :object-count="simulatorStore.objectCount"
      :particle-count="simulatorStore.particleCount"
      :running="simulatorStore.running"
      :is-phone-layout="isPhoneLayout"
      :show-authoring-controls="showAuthoringControls"
      :demo-mode="simulatorStore.demoMode"
      :classroom-mode="simulatorStore.classroomMode"
      :suppress-empty-state="isPhoneLayout && phoneAnySheetOpen"
      :show-teaching-rail="!isTabletLayout"
    />
    <GeometryOverlayBadge
      v-if="isPhoneLayout && simulatorStore.geometryInteraction"
      :source-key="simulatorStore.geometryInteraction.sourceKey"
      :real-value="simulatorStore.geometryInteraction.realValue"
      :display-value="simulatorStore.geometryInteraction.displayValue"
      :object-scale="simulatorStore.geometryInteraction.objectScale"
    />
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
      :expression-variables="simulatorStore.sceneVariables"
      :expression-time="simulatorStore.sceneTime"
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
