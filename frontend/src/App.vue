<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CanvasViewport from './components/CanvasViewport.vue';
import MarkdownBoard from './components/MarkdownBoard.vue';
import ObjectActionBar from './components/ObjectActionBar.vue';
import PhoneAddSheet from './components/PhoneAddSheet.vue';
import PhoneBottomNav from './components/PhoneBottomNav.vue';
import PhoneSelectedSheet from './components/PhoneSelectedSheet.vue';
import PropertyDrawer from './components/PropertyDrawer.vue';
import SceneSettingsControls from './components/SceneSettingsControls.vue';
import ToolbarPanel from './components/ToolbarPanel.vue';
import VariablesPanel from './components/VariablesPanel.vue';
import { useAppActions } from './modes/useAppActions';
import { buildPhoneGeometryRows, type GeometrySectionLike, type PhoneGeometryRow } from './modes/phoneGeometry';
import { usePhoneSheets } from './modes/usePhoneSheets';
import { useViewportLayout } from './modes/useViewportLayout';
import { useSimulatorStore } from './stores/simulatorStore';
import { createSwipeCloseGesture } from './utils/swipeCloseGesture';

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
const phoneSheetSwipeGesture = createSwipeCloseGesture(() => {
  closePhoneSheets();
});

const phoneDensityClass = computed(() =>
  simulatorStore.phoneDensityMode === 'comfortable' ? 'phone-density-comfortable' : 'phone-density-compact'
);
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
        <div class="header-actions">
          <button
            v-if="!isPhoneLayout || !showAuthoringControls"
            id="play-pause-btn"
            class="btn btn-primary"
            title="播放/暂停"
            aria-label="播放/暂停"
            @click="togglePlayPause"
          >
            <span id="play-icon">{{ simulatorStore.running ? '⏸' : '▶' }}</span>
            <span id="play-label">{{ simulatorStore.running ? '暂停' : '播放' }}</span>
          </button>
          <button
            v-if="showAuthoringControls && !isPhoneLayout"
            id="classroom-mode-btn"
            class="btn"
            :class="{ 'btn-primary': simulatorStore.classroomMode }"
            title="课堂演示模式"
            aria-label="课堂演示模式"
            :aria-pressed="simulatorStore.classroomMode ? 'true' : 'false'"
            @click="simulatorStore.toggleClassroomMode"
          >
            {{ simulatorStore.classroomMode ? '退出课堂' : '课堂演示' }}
          </button>
          <button id="reset-btn" class="btn" title="回到起始态" aria-label="回到起始态" @click="resetScene">🔄 回到起始态</button>
          <template v-if="showAuthoringControls">
            <button v-if="!isPhoneLayout" id="clear-btn" class="btn" title="清空场景" aria-label="清空场景" @click="clearScene">🗑 清空</button>
            <button v-if="!isPhoneLayout" id="save-btn" class="btn" title="保存场景" aria-label="保存场景" @click="saveScene">💾 保存</button>
            <button v-if="!isPhoneLayout" id="load-btn" class="btn" title="加载场景" aria-label="加载场景" @click="loadScene">📂 读取</button>
            <button v-if="!isPhoneLayout" id="export-btn" class="btn" title="导出场景" aria-label="导出场景" @click="exportScene">📤 导出</button>
            <button v-if="!isPhoneLayout" id="import-btn" class="btn" title="导入场景" aria-label="导入场景" @click="openImportDialog">📥 导入</button>
            <button v-if="!isPhoneLayout" id="theme-toggle-btn" class="btn" title="切换主题" aria-label="切换主题" @click="toggleTheme">🌙 主题</button>
            <button
              v-if="!isPhoneLayout"
              id="variables-btn"
              class="btn"
              :class="{ 'btn-primary': simulatorStore.variablesPanelOpen }"
              title="变量表"
              aria-label="变量表"
              :aria-pressed="simulatorStore.variablesPanelOpen ? 'true' : 'false'"
              @click="openVariablesPanel"
            >
              ƒx 变量
            </button>
            <button
              v-if="!isPhoneLayout"
              id="markdown-toggle-btn"
              class="btn"
              :class="{ 'btn-primary': simulatorStore.markdownBoardOpen }"
              title="题目板"
              aria-label="题目板"
              :aria-pressed="simulatorStore.markdownBoardOpen ? 'true' : 'false'"
              @click="toggleMarkdownBoard"
            >
              📝 题板
            </button>
            <button
              v-if="!isPhoneLayout"
              id="demo-mode-btn"
              class="btn"
              :class="{ 'btn-primary': simulatorStore.demoMode }"
              :title="simulatorStore.demoButtonTitle"
              aria-label="演示模式"
              :aria-pressed="simulatorStore.demoMode ? 'true' : 'false'"
              @click="toggleDemoMode"
            >
              {{ simulatorStore.demoButtonLabel }}
            </button>
          </template>
          <input
            id="import-file-input"
            ref="importFileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleImportChange"
          />
        </div>
        <div v-if="isPhoneLayout" class="phone-status-strip" data-testid="phone-status-strip">
          <span class="phone-status-text">{{ simulatorStore.statusText }}</span>
          <span class="phone-status-metrics">对象 {{ simulatorStore.objectCount }} · 粒子 {{ simulatorStore.particleCount }}</span>
        </div>
        <div
          v-if="showAuthoringControls && !isPhoneLayout"
          id="header-settings-panel"
          class="header-settings"
        >
          <SceneSettingsControls
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
      </div>
    </header>

    <aside v-if="showAuthoringControls && !isPhoneLayout" id="toolbar">
      <h2>组件库</h2>
      <ToolbarPanel :groups="simulatorStore.toolbarGroups" @create="createObjectFromToolbar" />
      <div class="tool-section preset-section">
        <h3>预设场景</h3>
        <button class="preset-btn" data-preset="uniform-acceleration" @click="loadPresetAndClose('uniform-acceleration')">匀加速运动</button>
        <button class="preset-btn" data-preset="cyclotron" @click="loadPresetAndClose('cyclotron')">回旋运动</button>
        <button class="preset-btn" data-preset="capacitor-deflection" @click="loadPresetAndClose('capacitor-deflection')">电容器偏转</button>
      </div>
    </aside>
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
    <section
      v-if="showAuthoringControls && isPhoneLayout && phoneSceneSheetOpen"
      class="phone-sheet phone-scene-sheet"
      data-testid="phone-scene-sheet"
      aria-label="场景参数面板"
    >
      <div
        class="phone-sheet-header"
        @pointerdown="phoneSheetSwipeGesture.onPointerDown"
        @pointerup="phoneSheetSwipeGesture.onPointerUp"
        @pointercancel="phoneSheetSwipeGesture.onPointerCancel"
      >
        <h3>场景参数</h3>
        <button type="button" class="btn-icon" aria-label="关闭场景参数面板" @click="closePhoneSheets">✖</button>
      </div>
      <div class="phone-sheet-body phone-scene-body">
        <SceneSettingsControls
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
    </section>
    <section
      v-if="showAuthoringControls && isPhoneLayout && phoneMoreSheetOpen"
      class="phone-sheet phone-more-sheet"
      data-testid="phone-more-sheet"
      aria-label="更多操作面板"
    >
      <div
        class="phone-sheet-header"
        @pointerdown="phoneSheetSwipeGesture.onPointerDown"
        @pointerup="phoneSheetSwipeGesture.onPointerUp"
        @pointercancel="phoneSheetSwipeGesture.onPointerCancel"
      >
        <h3>更多操作</h3>
        <button type="button" class="btn-icon" aria-label="关闭更多操作面板" @click="closePhoneSheets">✖</button>
      </div>
      <div class="phone-sheet-body phone-more-body">
        <button id="secondary-export-btn" class="btn" type="button" @click="exportSceneFromPhoneMore">📤 导出场景</button>
        <button id="secondary-import-btn" class="btn" type="button" @click="openImportDialogFromPhoneMore">📥 导入场景</button>
        <button id="secondary-theme-btn" class="btn" type="button" @click="toggleThemeFromPhoneMore">🌙 切换主题</button>
        <button id="secondary-save-btn" class="btn" type="button" @click="saveSceneFromPhoneMore">💾 保存场景</button>
        <button id="secondary-load-btn" class="btn" type="button" @click="loadSceneFromPhoneMore">📂 读取场景</button>
        <button id="secondary-clear-btn" class="btn" type="button" @click="clearSceneFromPhoneMore">🗑 清空场景</button>
        <button id="secondary-variables-btn" class="btn" type="button" @click="openVariablesPanelFromPhoneMore">ƒx 变量表</button>
        <button id="secondary-markdown-btn" class="btn" type="button" @click="toggleMarkdownBoardFromPhoneMore">📝 题板</button>
      </div>
    </section>
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

    <div v-if="showAuthoringControls" id="context-menu" class="context-menu" style="display: none">
      <div id="menu-properties" class="menu-item" @click="openSelectedProperties">⚙️ 属性</div>
      <div id="menu-duplicate" class="menu-item" @click="duplicateSelected">📋 复制</div>
      <div class="menu-separator"></div>
      <div id="menu-delete" class="menu-item" @click="deleteSelected">🗑️ 删除</div>
    </div>
  </div>
</template>
