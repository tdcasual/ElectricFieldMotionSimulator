<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import CanvasViewport from './components/CanvasViewport.vue';
import MarkdownBoard from './components/MarkdownBoard.vue';
import ObjectActionBar from './components/ObjectActionBar.vue';
import PropertyDrawer from './components/PropertyDrawer.vue';
import ToolbarPanel from './components/ToolbarPanel.vue';
import VariablesPanel from './components/VariablesPanel.vue';
import { useSimulatorStore } from './stores/simulatorStore';

const simulatorStore = useSimulatorStore();
const importFileInput = ref<HTMLInputElement | null>(null);
const isCoarsePointer = ref(false);
const phoneToolRailOpen = ref(false);
const showAuthoringControls = computed(() => !simulatorStore.viewMode);
const isPhoneLayout = computed(() => simulatorStore.layoutMode === 'phone');
const phoneToolRailExpanded = computed(() => showAuthoringControls.value && isPhoneLayout.value && phoneToolRailOpen.value);
const PHONE_LAYOUT_MAX_WIDTH = 767;
const TABLET_LAYOUT_MAX_WIDTH = 1199;

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
  return simulatorStore.layoutMode === 'phone' || isCoarsePointer.value;
});

watch(
  () => simulatorStore.layoutMode,
  (next) => {
    if (next !== 'phone') {
      phoneToolRailOpen.value = false;
    }
  }
);

function resolveLayoutMode(width: number) {
  if (width <= PHONE_LAYOUT_MAX_WIDTH) return 'phone';
  if (width <= TABLET_LAYOUT_MAX_WIDTH) return 'tablet';
  return 'desktop';
}

function syncLayoutModeFromViewport() {
  if (typeof window === 'undefined') return;
  simulatorStore.setLayoutMode(resolveLayoutMode(window.innerWidth));
}

function handleWindowResize() {
  syncLayoutModeFromViewport();
}

function syncCoarsePointer() {
  if (typeof window === 'undefined') return;
  const coarseByMedia = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const coarseByTouchPoints = (navigator.maxTouchPoints ?? 0) > 0;
  isCoarsePointer.value = coarseByMedia || coarseByTouchPoints;
}

onMounted(() => {
  syncLayoutModeFromViewport();
  syncCoarsePointer();
  window.addEventListener('resize', handleWindowResize);
  if (import.meta.env.MODE !== 'test') {
    simulatorStore.mountRuntime();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  if (import.meta.env.MODE !== 'test') {
    simulatorStore.unmountRuntime();
  }
});

function togglePlayPause() {
  simulatorStore.toggleRunning();
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
  if (window.confirm('确定要清空整个场景吗？此操作不可撤销。')) {
    simulatorStore.clearScene();
  }
}

function saveScene() {
  const sceneName = window.prompt('请输入场景名称:', 'my-scene');
  if (!sceneName) return;
  simulatorStore.saveScene(sceneName);
}

function loadScene() {
  const sceneName = window.prompt('请输入要加载的场景名称:', 'my-scene');
  if (!sceneName) return;
  simulatorStore.loadScene(sceneName);
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
  simulatorStore.setBoundaryMode(target.value as 'margin' | 'remove' | 'bounce' | 'wrap');
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

function applyProperties(values: Record<string, unknown>) {
  const result = simulatorStore.applyPropertyValues(values);
  if (!result.ok && import.meta.env.MODE !== 'test') {
    window.alert(result.error);
  }
}

function openVariablesPanel() {
  simulatorStore.openVariablesPanel();
}

function applyVariables(values: Record<string, number>) {
  simulatorStore.applyVariables(values);
}

function togglePhoneToolRail() {
  if (!isPhoneLayout.value) return;
  phoneToolRailOpen.value = !phoneToolRailOpen.value;
}

function closePhoneToolRail() {
  phoneToolRailOpen.value = false;
}

function createObjectFromToolbar(type: string) {
  simulatorStore.createObjectAtCenter(type);
  if (isPhoneLayout.value) {
    closePhoneToolRail();
  }
}

function loadPresetAndClose(name: string) {
  loadPreset(name);
  if (isPhoneLayout.value) {
    closePhoneToolRail();
  }
}

function openSelectedPropertiesFromActionBar() {
  simulatorStore.openPropertyPanel();
}

function duplicateSelectedFromActionBar() {
  simulatorStore.duplicateSelected();
}

function deleteSelectedFromActionBar() {
  simulatorStore.deleteSelected();
}
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
      'phone-toolbar-open': phoneToolRailExpanded
    }"
  >
    <header id="header">
      <h1>⚡ 电磁场粒子运动模拟器</h1>
      <div class="header-controls">
        <div class="header-actions">
          <button
            v-if="showAuthoringControls && isPhoneLayout"
            id="tool-rail-toggle-btn"
            class="btn"
            :class="{ 'btn-primary': phoneToolRailExpanded }"
            title="切换工具栏"
            aria-label="切换工具栏"
            :aria-pressed="phoneToolRailExpanded ? 'true' : 'false'"
            @click="togglePhoneToolRail"
          >
            🧰 工具栏
          </button>
          <button id="play-pause-btn" class="btn btn-primary" title="播放/暂停" aria-label="播放/暂停" @click="togglePlayPause">
            <span id="play-icon">{{ simulatorStore.running ? '⏸' : '▶' }}</span>
            <span id="play-label">{{ simulatorStore.running ? '暂停' : '播放' }}</span>
          </button>
          <button id="reset-btn" class="btn" title="回到起始态" aria-label="回到起始态" @click="resetScene">🔄 回到起始态</button>
          <template v-if="showAuthoringControls">
            <button id="clear-btn" class="btn" title="清空场景" aria-label="清空场景" @click="clearScene">🗑 清空</button>
            <button id="save-btn" class="btn" title="保存场景" aria-label="保存场景" @click="saveScene">💾 保存</button>
            <button id="load-btn" class="btn" title="加载场景" aria-label="加载场景" @click="loadScene">📂 读取</button>
            <button id="export-btn" class="btn" title="导出场景" aria-label="导出场景" @click="exportScene">📤 导出</button>
            <button id="import-btn" class="btn" title="导入场景" aria-label="导入场景" @click="openImportDialog">📥 导入</button>
            <button id="theme-toggle-btn" class="btn" title="切换主题" aria-label="切换主题" @click="toggleTheme">🌙 主题</button>
            <button
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
        <div v-if="showAuthoringControls" class="header-settings">
          <label class="control-label">
            <span>显示能量:</span>
            <input id="toggle-energy-overlay" type="checkbox" :checked="simulatorStore.showEnergyOverlay" @change="setShowEnergy" />
          </label>
          <label class="control-label">
            <span>比例尺: 1m =</span>
            <input
              id="scale-px-per-meter"
              type="number"
              min="0.0001"
              step="1"
              :value="simulatorStore.pixelsPerMeter"
              :disabled="simulatorStore.demoMode"
              @change="setPixelsPerMeter"
            />
            <span>px</span>
          </label>
          <label class="control-label">
            <span>重力 g:</span>
            <input
              id="gravity-input"
              type="number"
              min="0"
              step="0.1"
              :value="simulatorStore.gravity"
              :disabled="simulatorStore.demoMode"
              @change="setGravity"
            />
            <span>m/s²</span>
          </label>
          <label class="control-label">
            <span>边界:</span>
            <select id="boundary-mode-select" aria-label="边界处理方式" :value="simulatorStore.boundaryMode" @change="setBoundaryMode">
              <option value="margin">缓冲消失</option>
              <option value="remove">出界消失</option>
              <option value="bounce">反弹</option>
              <option value="wrap">穿越</option>
            </select>
          </label>
          <label
            id="boundary-margin-control"
            class="control-label"
            :style="{ display: simulatorStore.showBoundaryMarginControl ? '' : 'none' }"
          >
            <span>缓冲:</span>
            <input id="boundary-margin-input" type="number" min="0" step="10" :value="simulatorStore.boundaryMargin" @change="setBoundaryMargin" />
            <span>px</span>
          </label>
          <label class="control-label">
            <span>时间步长:</span>
            <input
              id="timestep-slider"
              type="range"
              min="0.001"
              max="0.05"
              step="0.001"
              :value="simulatorStore.timeStep"
              @input="setTimeStep"
            />
            <span id="timestep-value">{{ simulatorStore.timeStepLabel }}</span>
          </label>
        </div>
      </div>
    </header>

    <aside v-if="showAuthoringControls" id="toolbar" :class="{ 'phone-open': phoneToolRailExpanded }">
      <h2>组件库</h2>
      <ToolbarPanel :groups="simulatorStore.toolbarGroups" @create="createObjectFromToolbar" />
      <div class="tool-section preset-section">
        <h3>预设场景</h3>
        <button class="preset-btn" data-preset="uniform-acceleration" @click="loadPresetAndClose('uniform-acceleration')">匀加速运动</button>
        <button class="preset-btn" data-preset="cyclotron" @click="loadPresetAndClose('cyclotron')">回旋运动</button>
        <button class="preset-btn" data-preset="capacitor-deflection" @click="loadPresetAndClose('capacitor-deflection')">电容器偏转</button>
      </div>
    </aside>
    <button
      v-if="phoneToolRailExpanded"
      type="button"
      class="tool-rail-backdrop"
      aria-label="关闭工具栏"
      @click="closePhoneToolRail"
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
