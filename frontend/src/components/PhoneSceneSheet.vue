<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import SceneSettingsControls from './SceneSettingsControls.vue';
import { createSwipeCloseGesture } from '../utils/swipeCloseGesture';

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
  (event: 'close'): void;
  (event: 'set-show-energy', payload: Event): void;
  (event: 'set-pixels-per-meter', payload: Event): void;
  (event: 'set-gravity', payload: Event): void;
  (event: 'set-boundary-mode', payload: Event): void;
  (event: 'set-boundary-margin', payload: Event): void;
  (event: 'set-time-step', payload: Event): void;
}>();

const swipeGesture = createSwipeCloseGesture(() => {
  emit('close');
});

onBeforeUnmount(() => {
  swipeGesture.dispose();
});
</script>

<template>
  <section class="phone-sheet phone-scene-sheet" data-testid="phone-scene-sheet" aria-label="场景参数面板">
    <div
      class="phone-sheet-header"
      @pointerdown="swipeGesture.onPointerDown"
      @pointerup="swipeGesture.onPointerUp"
      @pointercancel="swipeGesture.onPointerCancel"
    >
      <h3>场景参数</h3>
      <button type="button" class="btn-icon" aria-label="关闭场景参数面板" @click="emit('close')">✖</button>
    </div>
    <div class="phone-sheet-body phone-scene-body">
      <SceneSettingsControls
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
  </section>
</template>
