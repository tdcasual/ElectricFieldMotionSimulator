import { defineStore } from 'pinia';

export const useSimulationStore = defineStore('simulation', {
  state: () => ({
    running: false,
    timeStep: 0.016
  }),
  actions: {
    toggleRunning() {
      this.running = !this.running;
    },
    setTimeStep(next: number) {
      if (!Number.isFinite(next) || next <= 0) return;
      this.timeStep = next;
    }
  }
});
