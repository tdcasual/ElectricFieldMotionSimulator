<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { createRendererBridge, type RendererBridge } from '../render/rendererBridge';

const bgCanvas = ref<HTMLCanvasElement | null>(null);
const fieldCanvas = ref<HTMLCanvasElement | null>(null);
const particleCanvas = ref<HTMLCanvasElement | null>(null);

let bridge: RendererBridge | null = null;

onMounted(() => {
  if (!bgCanvas.value || !fieldCanvas.value || !particleCanvas.value) return;
  bridge = createRendererBridge({
    background: bgCanvas.value,
    field: fieldCanvas.value,
    particle: particleCanvas.value
  });
  bridge.attach();
});

onBeforeUnmount(() => {
  bridge?.detach();
});
</script>

<template>
  <section data-testid="canvas-viewport" class="relative h-full w-full overflow-hidden bg-bg-primary">
    <canvas ref="bgCanvas" data-layer="bg" class="absolute inset-0 h-full w-full touch-none"></canvas>
    <canvas ref="fieldCanvas" data-layer="field" class="absolute inset-0 h-full w-full touch-none"></canvas>
    <canvas ref="particleCanvas" data-layer="particle" class="absolute inset-0 h-full w-full touch-none"></canvas>
  </section>
</template>
