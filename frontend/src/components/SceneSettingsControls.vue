<script setup lang="ts">
import { ref } from 'vue';

type BoundaryMode = 'margin' | 'remove' | 'bounce' | 'wrap';

const props = withDefaults(
  defineProps<{
    showEnergyOverlay: boolean;
    pixelsPerMeter: number;
    gravity: number;
    boundaryMode: BoundaryMode;
    showBoundaryMarginControl: boolean;
    boundaryMargin: number;
    timeStep: number;
    timeStepLabel: string;
    demoMode: boolean;
    compact?: boolean;
  }>(),
  {
    compact: false
  }
);

const emit = defineEmits<{
  (event: 'set-show-energy', payload: Event): void;
  (event: 'set-pixels-per-meter', payload: Event): void;
  (event: 'set-gravity', payload: Event): void;
  (event: 'set-boundary-mode', payload: Event): void;
  (event: 'set-boundary-margin', payload: Event): void;
  (event: 'set-time-step', payload: Event): void;
}>();

const advancedOpen = ref(false);
</script>

<template>
  <div class="scene-settings-shell" :class="{ 'scene-settings-shell--compact': props.compact }">
    <p v-if="props.demoMode" class="control-note" data-testid="scene-demo-note">演示模式下比例尺和重力已锁定，退出演示后可编辑。</p>
    <div class="scene-settings-primary" data-testid="desktop-settings-primary">
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
    </div>
    <button
      v-if="props.compact"
      type="button"
      class="scene-advanced-toggle"
      data-testid="scene-advanced-toggle"
      :aria-expanded="advancedOpen ? 'true' : 'false'"
      @click="advancedOpen = !advancedOpen"
    >
      {{ advancedOpen ? '收起高级参数' : '更多场景参数' }}
    </button>
    <div
      class="scene-settings-advanced"
      data-testid="desktop-settings-advanced"
      :data-open="props.compact ? (advancedOpen ? 'true' : 'false') : 'true'"
      :style="props.compact && !advancedOpen ? { display: 'none' } : undefined"
    >
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
    </div>
  </div>
</template>
