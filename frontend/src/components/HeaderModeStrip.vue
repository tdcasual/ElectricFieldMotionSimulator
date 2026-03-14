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

const teachingGuidance = computed(() => {
  if (!props.showAuthoringControls) return '课堂提示：先观察现象，再回到参数解释原因';
  if (props.demoMode) return '课堂提示：先请学生预测，再播放验证轨迹变化';
  if (props.classroomMode) return '课堂提示：按 放场 -> 加粒子 -> 播放 的顺序讲解';
  if (props.running) return '课堂提示：暂停时追问方向变化，播放时观察轨迹';
  return '课堂提示：先放场，再放粒子，最后播放观察';
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
    <span v-if="!props.compact" class="header-mode-guidance" data-testid="header-mode-guidance">{{ teachingGuidance }}</span>
    <span class="header-mode-metric">对象 {{ props.objectCount }}</span>
    <span class="header-mode-metric">粒子 {{ props.particleCount }}</span>
  </div>
</template>
