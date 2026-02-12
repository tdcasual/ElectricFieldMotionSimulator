<script setup lang="ts">
import ToolbarPanel from './components/ToolbarPanel.vue';
import CanvasViewport from './components/CanvasViewport.vue';
</script>

<template>
  <main data-testid="app-shell" class="grid h-full grid-cols-[220px_1fr]">
    <ToolbarPanel />
    <CanvasViewport />
  </main>
</template>
