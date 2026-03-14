<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  running: boolean;
  classroomMode: boolean;
  demoMode: boolean;
  showAuthoringControls: boolean;
  statusText: string;
  objectCount: number;
  particleCount: number;
  compact?: boolean;
}>();

const modeLabel = computed(() => {
  if (!props.showAuthoringControls) return '查看模式';
  if (props.demoMode) return '演示模式';
  if (props.classroomMode) return '课堂模式';
  return '编辑模式';
});

const modeTone = computed(() => {
  if (!props.showAuthoringControls) return 'view';
  if (props.demoMode) return 'demo';
  if (props.classroomMode) return 'classroom';
  return 'edit';
});

const conciseStatus = computed(() => {
  const text = String(props.statusText || '').trim();
  if (!text) return props.running ? '粒子轨迹正在更新' : '准备开始新的实验场景';
  if (props.demoMode && text.includes('已进入演示模式')) {
    return '滚轮或双指缩放观察场域变化';
  }
  return text;
});
</script>

<template>
  <div
    class="header-mode-strip"
    data-testid="header-mode-strip"
    :data-compact="props.compact ? 'true' : 'false'"
    aria-label="当前模式与状态"
  >
    <span class="header-mode-badge" :data-tone="modeTone">{{ modeLabel }}</span>
    <span class="header-mode-state">{{ props.running ? '运行中' : '已暂停' }}</span>
    <span v-if="!props.compact" class="header-mode-copy">{{ conciseStatus }}</span>
    <span class="header-mode-metric">对象 {{ props.objectCount }}</span>
    <span class="header-mode-metric">粒子 {{ props.particleCount }}</span>
  </div>
</template>
