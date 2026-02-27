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
  (event: 'create', objectType: string): void;
  (event: 'load-preset', presetName: string): void;
  (event: 'close'): void;
}>();
</script>

<template>
  <section class="phone-sheet phone-add-sheet" data-testid="phone-add-sheet" aria-label="添加对象面板">
    <div class="phone-sheet-header">
      <h3>添加对象</h3>
      <button type="button" class="btn-icon" aria-label="关闭添加对象面板" @click="emit('close')">✖</button>
    </div>
    <div class="phone-sheet-body">
      <ToolbarPanel :groups="props.groups" :tap-to-create="true" @create="emit('create', $event)" />
      <div class="tool-section preset-section">
        <h3>预设场景</h3>
        <button class="preset-btn" data-preset="uniform-acceleration" @click="emit('load-preset', 'uniform-acceleration')">匀加速运动</button>
        <button class="preset-btn" data-preset="cyclotron" @click="emit('load-preset', 'cyclotron')">回旋运动</button>
        <button class="preset-btn" data-preset="capacitor-deflection" @click="emit('load-preset', 'capacitor-deflection')">电容器偏转</button>
      </div>
    </div>
  </section>
</template>
