<script setup lang="ts">
type BoundaryMode = 'margin' | 'remove' | 'bounce' | 'wrap';

const props = defineProps<{
  showEnergyOverlay: boolean;
  pixelsPerMeter: number;
  gravity: number;
  boundaryMode: BoundaryMode;
  showBoundaryMarginControl: boolean;
  boundaryMargin: number;
  timeStep: number;
  timeStepLabel: string;
  demoMode: boolean;
}>();

const emit = defineEmits<{
  (event: 'set-show-energy', payload: Event): void;
  (event: 'set-pixels-per-meter', payload: Event): void;
  (event: 'set-gravity', payload: Event): void;
  (event: 'set-boundary-mode', payload: Event): void;
  (event: 'set-boundary-margin', payload: Event): void;
  (event: 'set-time-step', payload: Event): void;
}>();
</script>

<template>
  <label class="control-label">
    <span>显示能量:</span>
    <input id="toggle-energy-overlay" type="checkbox" :checked="props.showEnergyOverlay" @change="(event) => emit('set-show-energy', event)" />
  </label>
  <label class="control-label">
    <span>比例尺: 1m =</span>
    <input
      id="scale-px-per-meter"
      type="number"
      min="0.0001"
      step="1"
      :value="props.pixelsPerMeter"
      :disabled="props.demoMode"
      @change="(event) => emit('set-pixels-per-meter', event)"
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
      :value="props.gravity"
      :disabled="props.demoMode"
      @change="(event) => emit('set-gravity', event)"
    />
    <span>m/s²</span>
  </label>
  <label class="control-label">
    <span>边界:</span>
    <select
      id="boundary-mode-select"
      aria-label="边界处理方式"
      :value="props.boundaryMode"
      @change="(event) => emit('set-boundary-mode', event)"
    >
      <option value="margin">缓冲消失</option>
      <option value="remove">出界消失</option>
      <option value="bounce">反弹</option>
      <option value="wrap">穿越</option>
    </select>
  </label>
  <label
    id="boundary-margin-control"
    class="control-label"
    :style="{ display: props.showBoundaryMarginControl ? '' : 'none' }"
  >
    <span>缓冲:</span>
    <input
      id="boundary-margin-input"
      type="number"
      min="0"
      step="10"
      :value="props.boundaryMargin"
      @change="(event) => emit('set-boundary-margin', event)"
    />
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
      :value="props.timeStep"
      @input="(event) => emit('set-time-step', event)"
    />
    <span id="timestep-value">{{ props.timeStepLabel }}</span>
  </label>
</template>
