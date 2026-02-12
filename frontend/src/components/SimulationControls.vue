<script setup lang="ts">
import { computed } from 'vue';
import { useSimulationStore } from '../stores/simulationStore';

const simulationStore = useSimulationStore();
const runningLabel = computed(() => (simulationStore.running ? 'Pause' : 'Play'));

function toggleRunning() {
  simulationStore.toggleRunning();
}

function onTimeStepInput(event: Event) {
  const target = event.target as HTMLInputElement;
  simulationStore.setTimeStep(Number(target.value));
}
</script>

<template>
  <section class="flex items-center gap-3 border-b border-[var(--border-color)] p-3">
    <button
      data-testid="toggle-running"
      class="rounded-sm border border-[var(--border-color)] bg-bg-tertiary px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
      @click="toggleRunning"
    >
      {{ runningLabel }}
    </button>
    <label class="flex items-center gap-2 text-sm text-text-secondary">
      <span>dt</span>
      <input
        data-testid="time-step"
        class="w-24 rounded-sm border border-[var(--border-color)] bg-bg-primary px-2 py-1 text-text-primary"
        type="number"
        min="0.001"
        step="0.001"
        :value="simulationStore.timeStep"
        @input="onTimeStepInput"
      />
    </label>
  </section>
</template>
