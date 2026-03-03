<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import CanvasViewport from './components/CanvasViewport.vue';
import { useSimulatorStore } from './stores/simulatorStore';

const simulatorStore = useSimulatorStore();
const importFileInput = ref<HTMLInputElement | null>(null);
const sceneNameDraft = ref('v3-scene');

function createObject(type: string) {
  simulatorStore.createObjectAtCenter(type);
}

function updateSelectedNumericProp(key: string, value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  simulatorStore.setSelectedObjectProps({ [key]: numeric });
}

function updateSelectedColor(value: unknown) {
  const color = String(value ?? '').trim();
  if (!color) return;
  simulatorStore.setSelectedObjectProps({ color });
}

async function saveScene() {
  await simulatorStore.saveScene(sceneNameDraft.value);
}

async function loadScene() {
  await simulatorStore.loadScene(sceneNameDraft.value);
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

function clearScene() {
  if (simulatorStore.viewMode) return;
  simulatorStore.clearScene();
}

function resetScene() {
  simulatorStore.resetScene();
}

onMounted(() => {
  simulatorStore.mountRuntime();
});

onBeforeUnmount(() => {
  simulatorStore.unmountRuntime();
});
</script>

<template>
  <div id="app" :class="['layout-desktop', 'panel-open', { 'view-mode': simulatorStore.viewMode }]">
    <header id="header">
      <h1>Electric Field Motion Simulator V3</h1>
      <div class="header-controls">
        <div class="header-actions">
          <button class="btn btn-primary" @click="simulatorStore.toggleRunning">
            {{ simulatorStore.running ? 'Pause' : 'Play' }}
          </button>
          <button class="btn" @click="resetScene">Reset</button>
          <button class="btn" @click="clearScene" :disabled="simulatorStore.viewMode">Clear</button>
          <button class="btn" @click="simulatorStore.deleteSelected" :disabled="!simulatorStore.selectedObjectId || simulatorStore.viewMode">
            Delete Selected
          </button>
          <button class="btn" @click="simulatorStore.exportScene">Export</button>
          <button class="btn" @click="openImportDialog">Import</button>
          <input
            ref="importFileInput"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleImportChange"
          />
        </div>
        <div class="header-settings">
          <label class="control-label">
            Time Step
            <input
              id="timestep-slider"
              type="number"
              min="0.001"
              step="0.001"
              :value="simulatorStore.timeStep"
              @change="(event) => simulatorStore.setTimeStep(Number((event.target as HTMLInputElement).value))"
            />
            <span id="timestep-value">{{ simulatorStore.timeStepLabel }}</span>
          </label>
          <label class="control-label">
            Scene
            <input
              type="text"
              :value="sceneNameDraft"
              @input="(event) => (sceneNameDraft = (event.target as HTMLInputElement).value)"
            />
          </label>
          <button class="btn" @click="saveScene">Save</button>
          <button class="btn" @click="loadScene">Load</button>
        </div>
      </div>
    </header>

    <aside id="toolbar">
      <h2>Objects</h2>
      <div class="toolbar-content">
        <section
          v-for="group in simulatorStore.toolbarGroups"
          :key="group.key"
          class="toolbar-group"
        >
          <h3 class="toolbar-group-title">{{ group.label }}</h3>
          <button
            v-for="entry in group.entries"
            :key="entry.type"
            class="tool-item"
            :disabled="simulatorStore.viewMode"
            @click="createObject(entry.type)"
          >
            <span class="tool-item-label">{{ entry.label }}</span>
          </button>
        </section>
      </div>
    </aside>

    <CanvasViewport />

    <section id="property-panel" class="panel">
      <div class="panel-header">
        <h3>Selection</h3>
      </div>
      <div class="panel-content">
        <template v-if="simulatorStore.selectedObject">
          <p><strong>ID:</strong> {{ simulatorStore.selectedObject.id }}</p>
          <p><strong>Type:</strong> {{ simulatorStore.selectedObject.type }}</p>
          <div class="form-row">
            <label>X</label>
            <input
              type="number"
              :value="simulatorStore.selectedObject.x"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('x', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Y</label>
            <input
              type="number"
              :value="simulatorStore.selectedObject.y"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('y', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Velocity X</label>
            <input
              type="number"
              :value="simulatorStore.selectedObject.velocityX"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('velocityX', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Velocity Y</label>
            <input
              type="number"
              :value="simulatorStore.selectedObject.velocityY"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('velocityY', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Radius</label>
            <input
              type="number"
              min="1"
              :value="simulatorStore.selectedObject.radius"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('radius', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Width</label>
            <input
              type="number"
              min="1"
              :value="simulatorStore.selectedObject.width"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('width', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Height</label>
            <input
              type="number"
              min="1"
              :value="simulatorStore.selectedObject.height"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedNumericProp('height', (event.target as HTMLInputElement).value)"
            />
          </div>
          <div class="form-row">
            <label>Color</label>
            <input
              type="color"
              :value="simulatorStore.selectedObject.color"
              :disabled="simulatorStore.viewMode"
              @change="(event) => updateSelectedColor((event.target as HTMLInputElement).value)"
            />
          </div>
        </template>
        <p v-else>No object selected.</p>
      </div>
    </section>

    <footer id="footer">
      <span id="status-text">{{ simulatorStore.statusText }}</span>
      <span>Objects: {{ simulatorStore.objectCount }}</span>
      <span>FPS: {{ simulatorStore.fps }}</span>
    </footer>
  </div>
</template>
