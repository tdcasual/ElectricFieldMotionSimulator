<script setup lang="ts">
import { computed } from 'vue';
import { createSwipeCloseGesture } from '../utils/swipeCloseGesture';

type PhoneGeometryRow = {
  sourceKey: string;
  label: string;
  realKey: string;
  displayKey: string;
  realValue: unknown;
  displayValue: unknown;
};

const props = withDefaults(
  defineProps<{
    title?: string;
    selectedObjectId?: string | null;
    objectScale?: number;
    geometryRows?: PhoneGeometryRow[];
  }>(),
  {
    title: '选中对象',
    selectedObjectId: null,
    objectScale: 1,
    geometryRows: () => []
  }
);

const emit = defineEmits<{
  (event: 'open-properties'): void;
  (event: 'duplicate'): void;
  (event: 'delete'): void;
  (event: 'update-value', payload: { key: string; value: string }): void;
  (event: 'close'): void;
}>();
const sheetSwipeGesture = createSwipeCloseGesture(() => {
  emit('close');
});

const scaleLabel = computed(() => {
  const value = Number(props.objectScale);
  if (!Number.isFinite(value) || value <= 0) return '1';
  return Number(value.toFixed(3)).toString();
});

function normalizeInputValue(value: unknown) {
  if (value == null) return '';
  return String(value);
}

function emitNumberChange(key: string, event: Event) {
  if (!key) return;
  const target = event.target as HTMLInputElement | null;
  if (!target) return;
  emit('update-value', {
    key,
    value: target.value
  });
}
</script>

<template>
  <section class="phone-sheet phone-selected-sheet" data-testid="phone-selected-sheet" aria-label="选中对象快捷面板">
    <div
      class="phone-sheet-header"
      @pointerdown="sheetSwipeGesture.onPointerDown"
      @pointerup="sheetSwipeGesture.onPointerUp"
      @pointercancel="sheetSwipeGesture.onPointerCancel"
    >
      <h3>{{ props.title }}</h3>
      <button type="button" class="btn-icon" aria-label="关闭选中对象面板" @click="emit('close')">✖</button>
    </div>
    <div class="phone-sheet-body">
      <p class="phone-selected-meta">对象 ID: {{ props.selectedObjectId || '未选中' }}</p>
      <p class="phone-selected-scale">对象显示比例: <strong id="phone-selected-scale-value">{{ scaleLabel }}</strong></p>
      <div v-if="props.geometryRows.length" class="phone-selected-geometry-list">
        <div
          v-for="row in props.geometryRows"
          :key="row.sourceKey"
          class="phone-selected-geometry-item"
        >
          <p class="phone-selected-geometry-title">{{ row.label }}</p>
          <div class="phone-selected-geometry-inputs">
            <label class="phone-selected-geometry-field">
              <span>真实</span>
              <input
                :id="`phone-selected-${row.sourceKey}-real`"
                type="number"
                step="any"
                :value="normalizeInputValue(row.realValue)"
                @change="emitNumberChange(row.realKey, $event)"
              />
            </label>
            <label class="phone-selected-geometry-field">
              <span>显示</span>
              <input
                :id="`phone-selected-${row.sourceKey}-display`"
                type="number"
                step="any"
                :value="normalizeInputValue(row.displayValue)"
                @change="emitNumberChange(row.displayKey, $event)"
              />
            </label>
          </div>
        </div>
      </div>
      <p v-else class="phone-selected-empty">当前对象暂无可快捷编辑的几何参数</p>
      <div class="phone-selected-actions">
        <button id="phone-selected-properties-btn" class="btn btn-primary" type="button" @click="emit('open-properties')">属性</button>
        <button id="phone-selected-duplicate-btn" class="btn" type="button" @click="emit('duplicate')">复制</button>
        <button id="phone-selected-delete-btn" class="btn object-action-danger" type="button" @click="emit('delete')">删除</button>
      </div>
    </div>
  </section>
</template>
