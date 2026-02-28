<script setup lang="ts">
const props = defineProps<{
  sourceKey: string;
  realValue: number;
  displayValue: number;
  objectScale: number;
}>();

const FIELD_LABELS: Record<string, string> = {
  radius: '半径',
  width: '宽度',
  height: '高度',
  length: '长度',
  plateDistance: '板距',
  depth: '深度',
  viewGap: '视窗间距',
  spotSize: '光斑尺寸',
  lineWidth: '线宽',
  particleRadius: '粒子半径'
};

function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return '--';
  return String(Number(value.toFixed(digits)));
}
</script>

<template>
  <aside class="geometry-overlay-badge" data-testid="geometry-overlay-badge" aria-live="polite" aria-atomic="true">
    <p class="geometry-overlay-title">{{ FIELD_LABELS[props.sourceKey] || props.sourceKey }}</p>
    <p class="geometry-overlay-row">
      <span class="geometry-overlay-key">real</span>
      <strong data-testid="geometry-overlay-real">{{ formatNumber(props.realValue, 3) }}</strong>
    </p>
    <p class="geometry-overlay-row">
      <span class="geometry-overlay-key">display</span>
      <strong data-testid="geometry-overlay-display">{{ formatNumber(props.displayValue, 1) }}</strong>
    </p>
    <p class="geometry-overlay-row">
      <span class="geometry-overlay-key">scale</span>
      <strong data-testid="geometry-overlay-scale">{{ formatNumber(props.objectScale, 3) }}</strong>
    </p>
  </aside>
</template>
