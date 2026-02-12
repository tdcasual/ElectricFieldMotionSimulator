<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'apply'): void;
}>();

function close() {
  emit('update:modelValue', false);
}

function apply() {
  emit('apply');
}
</script>

<template>
  <aside
    v-if="props.modelValue"
    class="fixed right-0 top-0 h-full w-[320px] border-l border-[var(--border-color)] bg-bg-secondary p-4"
    data-testid="property-drawer"
  >
    <header class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold">Properties</h3>
      <button class="text-sm text-text-secondary hover:text-text-primary" @click="close">Close</button>
    </header>
    <div class="mb-4 text-sm text-text-muted">Schema-driven property editor placeholder.</div>
    <button
      data-testid="apply-props"
      class="rounded-sm border border-[var(--border-color)] bg-bg-tertiary px-3 py-2 text-sm text-text-primary hover:bg-bg-hover"
      @click="apply"
    >
      Apply
    </button>
  </aside>
</template>
