<script setup lang="ts">
import CanvasEmptyState from './CanvasEmptyState.vue';

const props = withDefaults(
  defineProps<{
    fps?: number;
    objectCount?: number;
    running?: boolean;
    isPhoneLayout?: boolean;
    showAuthoringControls?: boolean;
    demoMode?: boolean;
    suppressEmptyState?: boolean;
  }>(),
  {
    fps: 0,
    objectCount: 0,
    running: false,
    isPhoneLayout: false,
    showAuthoringControls: true,
    demoMode: false,
    suppressEmptyState: false
  }
);
</script>

<template>
  <main id="canvas-area" data-testid="canvas-viewport">
    <div id="canvas-container">
      <canvas id="bg-canvas" data-layer="bg"></canvas>
      <canvas id="field-canvas" data-layer="field"></canvas>
      <canvas id="particle-canvas" data-layer="particle"></canvas>
    </div>
    <CanvasEmptyState
      v-if="props.showAuthoringControls && props.objectCount === 0 && !props.suppressEmptyState"
      :running="props.running"
      :is-phone-layout="props.isPhoneLayout"
      :demo-mode="props.demoMode"
    />
    <div id="fps-counter">FPS: {{ Math.round(props.fps) }}</div>
  </main>
</template>
