<script setup lang="ts">
const props = defineProps<{
  statusText: string;
  objectCount: number;
  particleCount: number;
}>();
</script>

<template>
  <footer id="footer">
    <span id="status-text">{{ props.statusText }}</span>
    <span id="object-count">对象: {{ props.objectCount }}</span>
    <span id="particle-count">粒子: {{ props.particleCount }}</span>
  </footer>
</template>
