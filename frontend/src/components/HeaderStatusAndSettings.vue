<script setup lang="ts">
import { computed } from 'vue';
import SceneSettingsControls from './SceneSettingsControls.vue';

type BoundaryMode = 'margin' | 'remove' | 'bounce' | 'wrap';

const props = defineProps<{
  isPhoneLayout: boolean;
  showAuthoringControls: boolean;
  statusText: string;
  objectCount: number;
  particleCount: number;
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

const phoneStatusText = computed(() => {
  if (!props.isPhoneLayout) return props.statusText;
  if (props.demoMode) return '演示模式：比例尺/重力已锁定';
  return props.statusText;
});

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
  <div v-if="props.isPhoneLayout" class="phone-status-strip" data-testid="phone-status-strip">
    <span class="phone-status-badge">{{ props.demoMode ? '演示' : '场景' }}</span>
    <span class="phone-status-text">{{ phoneStatusText }}</span>
    <span class="phone-status-metrics">对象 {{ props.objectCount }} · 粒子 {{ props.particleCount }}</span>
  </div>
  <div v-if="props.showAuthoringControls && !props.isPhoneLayout" id="header-settings-panel" class="header-settings">
    <div class="desktop-scene-settings" data-testid="desktop-scene-settings">
    <SceneSettingsControls
      compact
      :show-energy-overlay="props.showEnergyOverlay"
      :pixels-per-meter="props.pixelsPerMeter"
      :gravity="props.gravity"
      :boundary-mode="props.boundaryMode"
      :show-boundary-margin-control="props.showBoundaryMarginControl"
      :boundary-margin="props.boundaryMargin"
      :time-step="props.timeStep"
      :time-step-label="props.timeStepLabel"
      :demo-mode="props.demoMode"
      @set-show-energy="(event) => emit('set-show-energy', event)"
      @set-pixels-per-meter="(event) => emit('set-pixels-per-meter', event)"
      @set-gravity="(event) => emit('set-gravity', event)"
      @set-boundary-mode="(event) => emit('set-boundary-mode', event)"
      @set-boundary-margin="(event) => emit('set-boundary-margin', event)"
      @set-time-step="(event) => emit('set-time-step', event)"
    />
    </div>
  </div>
</template>
