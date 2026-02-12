<script setup lang="ts">
import { useSceneStore } from '../stores/sceneStore';

const sceneStore = useSceneStore();

function create(objectType: string) {
  sceneStore.dispatch({
    type: 'addObject',
    payload: { objectType }
  });
}
</script>

<template>
  <aside class="flex h-full flex-col gap-2 border-r border-[var(--border-color)] p-3">
    <h2 class="text-sm font-semibold text-text-secondary">Toolbar</h2>
    <button
      data-tool="particle"
      class="rounded-sm border border-[var(--border-color)] bg-bg-tertiary px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover"
      @click="create('particle')"
    >
      Particle
    </button>
  </aside>
</template>
