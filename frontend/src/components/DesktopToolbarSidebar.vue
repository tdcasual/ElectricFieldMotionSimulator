<script setup lang="ts">
import { computed } from 'vue';
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
  compact?: boolean;
}>();

const emit = defineEmits<{
  (event: 'create', type: string): void;
  (event: 'load-preset', name: string): void;
}>();

const hintCopy = computed(() =>
  props.compact
    ? '双击组件可居中创建，预设可快速进入讲解。'
    : '从空白画布开始搭建演示，也可以直接从预设场景进入经典教学起点。单击后点击画布放置，双击可直接居中创建。'
);
</script>

<template>
  <aside id="toolbar" :data-compact="props.compact ? 'true' : 'false'">
    <div class="toolbar-head">
      <p class="toolbar-kicker">搭建实验</p>
      <h2>组件库</h2>
      <p class="toolbar-hint" data-testid="desktop-toolbar-hint">{{ hintCopy }}</p>
    </div>
    <ToolbarPanel :groups="props.groups" @create="(type) => emit('create', type)" />
    <div class="tool-section preset-section" data-testid="desktop-preset-section">
      <div class="preset-section-heading">
        <h3>预设场景</h3>
        <p>快速进入基础运动与经典实验</p>
      </div>
      <button class="preset-btn" data-preset="uniform-acceleration" @click="emit('load-preset', 'uniform-acceleration')">匀加速运动</button>
      <button class="preset-btn" data-preset="cyclotron" @click="emit('load-preset', 'cyclotron')">回旋运动</button>
      <button class="preset-btn" data-preset="capacitor-deflection" @click="emit('load-preset', 'capacitor-deflection')">电容器偏转</button>
    </div>
  </aside>
</template>
