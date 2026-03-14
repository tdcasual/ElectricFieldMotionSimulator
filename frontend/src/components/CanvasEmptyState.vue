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

const desktopPlaybook = ['先放场', '再放粒子', '最后播放观察'];
</script>

<template>
  <div class="canvas-empty-state" data-testid="canvas-empty-state" aria-live="polite">
    <div class="canvas-empty-card">
      <span class="canvas-empty-badge">{{ modeLabel }}</span>
      <h2 class="canvas-empty-title">{{ headline }}</h2>
      <p class="canvas-empty-copy">{{ supportingCopy }}</p>
      <div v-if="!props.isPhoneLayout" class="canvas-empty-playbook" data-testid="canvas-empty-playbook">
        <p class="canvas-empty-playbook-title">一轮标准演示</p>
        <ol class="canvas-empty-playbook-list">
          <li v-for="step in desktopPlaybook" :key="step" class="canvas-empty-playbook-item">{{ step }}</li>
        </ol>
      </div>
      <div class="canvas-empty-tips">
        <span class="canvas-empty-tip">{{ props.isPhoneLayout ? '添加' : '组件库' }}</span>
        <span class="canvas-empty-tip">{{ props.isPhoneLayout ? '场景参数' : '预设场景' }}</span>
        <span class="canvas-empty-tip">{{ props.running ? '播放前置' : '即时搭建' }}</span>
      </div>
    </div>
  </div>
</template>
