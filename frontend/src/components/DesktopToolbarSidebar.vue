<script setup lang="ts">
import ToolbarPanel from './ToolbarPanel.vue';

type ToolbarEntry = {
  type: string;
  label: string;
  icon?: string | null;
};

type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

const props = defineProps<{
  groups: ToolbarGroup[];
}>();

const emit = defineEmits<{
  (event: 'create', type: string): void;
  (event: 'load-preset', name: string): void;
}>();
</script>

<template>
  <aside id="toolbar">
    <h2>组件库</h2>
    <ToolbarPanel :groups="props.groups" @create="(type) => emit('create', type)" />
    <div class="tool-section preset-section">
      <h3>预设场景</h3>
      <button class="preset-btn" data-preset="uniform-acceleration" @click="emit('load-preset', 'uniform-acceleration')">匀加速运动</button>
      <button class="preset-btn" data-preset="cyclotron" @click="emit('load-preset', 'cyclotron')">回旋运动</button>
      <button class="preset-btn" data-preset="capacitor-deflection" @click="emit('load-preset', 'capacitor-deflection')">电容器偏转</button>
    </div>
  </aside>
</template>
