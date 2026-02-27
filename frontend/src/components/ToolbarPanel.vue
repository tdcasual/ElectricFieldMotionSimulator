<script setup lang="ts">
import { ref } from 'vue';

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

const props = withDefaults(
  defineProps<{
    groups: ToolbarGroup[];
    tapToCreate?: boolean;
  }>(),
  {
    tapToCreate: false
  }
);

const emit = defineEmits<{
  (event: 'create', objectType: string): void;
}>();

function createAtCenter(type: string) {
  emit('create', type);
}

function handleToolClick(type: string) {
  if (!props.tapToCreate) return;
  createAtCenter(type);
}

const collapsedGroups = ref<Set<string>>(new Set());

function isCollapsed(groupKey: string) {
  return collapsedGroups.value.has(groupKey);
}

function toggleGroup(groupKey: string) {
  const next = new Set(collapsedGroups.value);
  if (next.has(groupKey)) next.delete(groupKey);
  else next.add(groupKey);
  collapsedGroups.value = next;
}
</script>

<template>
  <div id="toolbar-content" class="toolbar-content">
    <section v-for="group in props.groups" :key="group.key" class="tool-section toolbar-group" :data-group="group.key">
      <button
        type="button"
        class="toolbar-group-toggle"
        :aria-expanded="isCollapsed(group.key) ? 'false' : 'true'"
        :aria-controls="`toolbar-group-${group.key}`"
        @click="toggleGroup(group.key)"
      >
        <h3 class="toolbar-group-title">{{ group.label }}</h3>
        <span class="toolbar-group-chevron" :class="{ collapsed: isCollapsed(group.key) }" aria-hidden="true">▾</span>
      </button>
      <div :id="`toolbar-group-${group.key}`" v-show="!isCollapsed(group.key)" class="toolbar-group-items">
        <div
          v-for="entry in group.entries"
          :key="entry.type"
          class="tool-item"
          role="button"
          tabindex="0"
          draggable="true"
          :data-type="entry.type"
          :title="entry.label"
          :aria-label="entry.label"
          aria-pressed="false"
          @click="handleToolClick(entry.type)"
          @dblclick.prevent="createAtCenter(entry.type)"
          @keydown.enter.prevent="createAtCenter(entry.type)"
        >
          <div v-if="entry.icon" class="tool-icon tool-item-icon" v-html="entry.icon"></div>
          <span class="tool-item-label">{{ entry.label }}</span>
        </div>
      </div>
    </section>
  </div>
</template>
