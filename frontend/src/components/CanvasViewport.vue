<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    fps?: number;
  }>(),
  {
    fps: 0
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
    <div id="fps-counter">FPS: {{ Math.round(props.fps) }}</div>
  </main>
</template>
