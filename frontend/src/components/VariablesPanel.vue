<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import DrawerHost from './DrawerHost.vue';

type VariableRows = Array<{ id: string; name: string; value: string; error: string }>;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    layoutMode?: 'desktop' | 'tablet' | 'phone';
    variables?: Record<string, number>;
  }>(),
  {
    layoutMode: 'desktop',
    variables: () => ({})
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'apply', values: Record<string, number>): void;
}>();

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
let idSeed = 0;
const rows = reactive<VariableRows>([]);
const panelError = ref('');

function nextId() {
  idSeed += 1;
  return `var-row-${idSeed}`;
}

function resetRows(nextVars: Record<string, number>) {
  rows.splice(0, rows.length);
  for (const [name, value] of Object.entries(nextVars)) {
    rows.push({
      id: nextId(),
      name,
      value: Number.isFinite(value) ? String(value) : '0',
      error: ''
    });
  }
  if (rows.length === 0) {
    rows.push({ id: nextId(), name: '', value: '0', error: '' });
  }
  panelError.value = '';
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    resetRows(props.variables ?? {});
  },
  { immediate: true }
);

watch(
  () => props.variables,
  (next) => {
    if (!props.modelValue) return;
    resetRows(next ?? {});
  },
  { deep: true }
);

function close() {
  emit('update:modelValue', false);
}

function addRow() {
  rows.push({ id: nextId(), name: '', value: '0', error: '' });
}

function removeRow(id: string) {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return;
  rows.splice(index, 1);
  if (rows.length === 0) {
    rows.push({ id: nextId(), name: '', value: '0', error: '' });
  }
}

function clearErrors() {
  panelError.value = '';
  for (const row of rows) {
    row.error = '';
  }
}

function validateAndBuildValues() {
  clearErrors();
  const used = new Set<string>();
  const result: Record<string, number> = {};

  for (const row of rows) {
    const name = row.name.trim();
    const value = Number(row.value);
    if (!name) continue;

    if (!NAME_RE.test(name) || RESERVED.has(name)) {
      row.error = '变量名无效';
      continue;
    }
    if (used.has(name)) {
      row.error = '变量名重复';
      continue;
    }
    if (!Number.isFinite(value)) {
      row.error = '数值无效';
      continue;
    }

    used.add(name);
    result[name] = value;
  }

  const hasRowErrors = rows.some((row) => row.error);
  if (hasRowErrors) {
    panelError.value = '请修正变量表中的错误项后再应用';
    return null;
  }

  return result;
}

function apply() {
  const values = validateAndBuildValues();
  if (!values) return;
  emit('apply', values);
}
</script>

<template>
  <DrawerHost
    :model-value="props.modelValue"
    variant="variables"
    :layout-mode="props.layoutMode"
    backdrop="always"
    :close-on-backdrop="true"
    test-id="variables-panel"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <div class="modal variables-modal" :class="{ 'variables-sheet': props.layoutMode === 'phone' }">
      <div class="modal-header">
        <h3>变量表</h3>
        <button class="btn-icon" aria-label="关闭变量表" @click="close">✖</button>
      </div>
      <div class="modal-content">
        <div class="variables-toolbar">
          <button class="btn" data-testid="add-variable-row" @click="addRow">+ 添加变量</button>
        </div>
        <div class="variables-grid">
          <div class="variables-grid-header">变量名</div>
          <div class="variables-grid-header">数值</div>
          <div class="variables-grid-header">操作</div>
          <template v-for="row in rows" :key="row.id">
            <div>
              <input
                v-model="row.name"
                class="variables-input"
                type="text"
                placeholder="例如 a"
              />
              <div v-if="row.error" class="variables-error">{{ row.error }}</div>
            </div>
            <div>
              <input
                v-model="row.value"
                class="variables-input"
                type="number"
                step="any"
                placeholder="0"
              />
            </div>
            <div>
              <button class="btn" @click="removeRow(row.id)">删除</button>
            </div>
          </template>
        </div>
        <div v-if="panelError" class="variables-panel-error">{{ panelError }}</div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="close">取消</button>
        <button class="btn btn-primary" data-testid="apply-variables" @click="apply">应用变量</button>
      </div>
    </div>
  </DrawerHost>
</template>
