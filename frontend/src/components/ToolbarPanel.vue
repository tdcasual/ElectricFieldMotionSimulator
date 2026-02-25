<script setup lang="ts">
export type ToolbarEntry = {
  type: string;
  label: string;
  icon?: string | null;
};

export type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

const props = defineProps<{
  groups: ToolbarGroup[];
}>();

const emit = defineEmits<{
  (event: 'create', objectType: string): void;
}>();

function createAtCenter(type: string) {
  emit('create', type);
}
</script>

<template>
  <div id="toolbar-content">
    <div v-for="group in props.groups" :key="group.key" class="tool-section">
      <h3>{{ group.label }}</h3>
      <div
        v-for="entry in group.entries"
        :key="entry.type"
        class="tool-item"
        draggable="true"
        :data-type="entry.type"
        :title="entry.label"
        @dblclick.prevent="createAtCenter(entry.type)"
      >
        <div v-if="entry.icon" class="tool-icon" v-html="entry.icon"></div>
        <span>{{ entry.label }}</span>
      </div>
    </div>
  </div>
</template>
