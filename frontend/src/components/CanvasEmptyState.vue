<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  running: boolean;
  isPhoneLayout: boolean;
  demoMode: boolean;
}>();

const modeLabel = computed(() => {
  if (props.demoMode) return '演示准备';
  return '空白场景';
});

const headline = computed(() => {
  if (props.running) return '先添加对象，再开始演示';
  if (props.isPhoneLayout) return '点底部“添加”开始搭建场景';
  return '从左侧组件库开始搭建实验场景';
});

const supportingCopy = computed(() => {
  if (props.isPhoneLayout) {
    return '你也可以先打开“场景”调整比例尺和边界，再回到“添加”搭建实验。';
  }
  return '可以直接双击创建对象，或者先载入预设场景，快速进入课堂演示。';
});
</script>

<template>
  <div class="canvas-empty-state" data-testid="canvas-empty-state" aria-live="polite">
    <div class="canvas-empty-card">
      <span class="canvas-empty-badge">{{ modeLabel }}</span>
      <h2 class="canvas-empty-title">{{ headline }}</h2>
      <p class="canvas-empty-copy">{{ supportingCopy }}</p>
      <div class="canvas-empty-tips">
        <span class="canvas-empty-tip">{{ props.isPhoneLayout ? '添加' : '组件库' }}</span>
        <span class="canvas-empty-tip">{{ props.isPhoneLayout ? '场景参数' : '预设场景' }}</span>
        <span class="canvas-empty-tip">{{ props.running ? '播放前置' : '即时搭建' }}</span>
      </div>
    </div>
  </div>
</template>
