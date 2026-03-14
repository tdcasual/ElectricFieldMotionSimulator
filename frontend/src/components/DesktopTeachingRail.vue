<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  objectCount: number;
  particleCount: number;
  running: boolean;
  classroomMode: boolean;
  demoMode: boolean;
}>();

const currentStep = computed(() => {
  if (props.running) return 3;
  if (props.particleCount > 0) return 3;
  if (props.objectCount > 0) return 2;
  return 1;
});

const railTitle = computed(() => {
  if (props.running) return '播放中';
  if (props.particleCount > 0) return '准备播放';
  return '下一步';
});

const railCopy = computed(() => {
  if (props.running && props.demoMode) return '暂停提问，再继续播放验证视角变化。';
  if (props.running) return '暂停提问，追问偏转方向，再继续播放验证。';
  if (props.particleCount > 0 && props.classroomMode) return '先请学生预测，再点击播放进入课堂观察。';
  if (props.particleCount > 0) return '粒子已就位，可以点击播放观察轨迹。';
  return '先加入粒子，让受力与轨迹更容易讲清楚。';
});

const steps = computed(() => [
  {
    id: 1,
    label: '布场',
    state: currentStep.value > 1 ? 'done' : 'done'
  },
  {
    id: 2,
    label: '加粒子',
    state: currentStep.value > 2 ? 'done' : currentStep.value === 2 ? 'active' : 'idle'
  },
  {
    id: 3,
    label: '播放观察',
    state: currentStep.value === 3 ? 'active' : 'idle'
  }
]);
</script>

<template>
  <div class="desktop-teaching-rail" data-testid="desktop-teaching-rail" aria-live="polite">
    <div class="desktop-teaching-rail-copy">
      <span class="desktop-teaching-rail-kicker">{{ railTitle }}</span>
      <span class="desktop-teaching-rail-text">{{ railCopy }}</span>
    </div>
    <div class="desktop-teaching-rail-steps" aria-label="课堂演示进度">
      <span
        v-for="step in steps"
        :key="step.id"
        class="desktop-teaching-rail-step"
        :data-step="String(step.id)"
        :data-state="step.state"
      >
        {{ step.label }}
      </span>
    </div>
  </div>
</template>
