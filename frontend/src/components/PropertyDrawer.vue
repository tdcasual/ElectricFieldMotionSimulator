<script setup lang="ts">
import { reactive, watch } from 'vue';

type SchemaField = {
  key: string;
  label?: string;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  rows?: number;
  options?: Array<{ value: unknown; label?: string }>;
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  enabledWhen?: (values: Record<string, unknown>) => boolean;
};

type SchemaSection = {
  title?: string;
  fields?: SchemaField[];
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    sections?: SchemaSection[];
    values?: Record<string, unknown>;
  }>(),
  {
    title: '属性面板',
    sections: () => [],
    values: () => ({})
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'apply', values: Record<string, unknown>): void;
}>();

const draft = reactive<Record<string, unknown>>({});

function replaceDraft(next: Record<string, unknown>) {
  for (const key of Object.keys(draft)) {
    delete draft[key];
  }
  for (const [key, value] of Object.entries(next)) {
    draft[key] = value;
  }
}

watch(
  () => props.values,
  (next) => {
    replaceDraft(next ?? {});
  },
  { immediate: true, deep: true }
);

function isVisible(field: SchemaField) {
  if (typeof field.visibleWhen !== 'function') return true;
  try {
    return !!field.visibleWhen(draft);
  } catch {
    return true;
  }
}

function isEnabled(field: SchemaField) {
  if (typeof field.enabledWhen !== 'function') return true;
  try {
    return !!field.enabledWhen(draft);
  } catch {
    return true;
  }
}

function close() {
  emit('update:modelValue', false);
}

function apply() {
  const payload: Record<string, unknown> = { ...draft };
  for (const section of props.sections) {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    for (const field of fields) {
      if (field.type !== 'number') continue;
      if (!(field.key in payload)) continue;
      const raw = payload[field.key];
      if (raw == null || raw === '') continue;
      payload[field.key] = String(raw);
    }
  }
  emit('apply', payload);
}

function fieldType(field: SchemaField) {
  return field.type === 'number' ? 'number' : 'text';
}
</script>

<template>
  <aside
    id="property-panel"
    class="panel"
    :class="{ open: props.modelValue }"
    :style="{ display: props.modelValue ? 'flex' : 'none' }"
    data-testid="property-drawer"
  >
    <div class="panel-header">
      <h3>{{ props.title }}</h3>
      <button id="close-panel-btn" class="btn-icon" aria-label="关闭属性面板" @click="close">✖</button>
    </div>
    <div id="property-content" class="panel-content">
      <template v-for="(section, sectionIndex) in props.sections" :key="`section-${sectionIndex}`">
        <h4 v-if="section.title">{{ section.title }}</h4>
        <div
          v-for="field in section.fields ?? []"
          :key="field.key"
          class="form-row"
          :style="{ display: isVisible(field) ? '' : 'none' }"
        >
          <label v-if="field.type === 'checkbox'">
            <input v-model="draft[field.key]" type="checkbox" :disabled="!isEnabled(field)" />
            {{ field.label ?? field.key }}
          </label>
          <template v-else>
            <label>{{ field.label ?? field.key }}</label>
            <select
              v-if="field.type === 'select'"
              v-model="draft[field.key]"
              :disabled="!isEnabled(field)"
            >
              <option v-for="option in field.options ?? []" :key="String(option.value)" :value="option.value">
                {{ option.label ?? String(option.value) }}
              </option>
            </select>
            <textarea
              v-else-if="field.multiline"
              v-model="draft[field.key]"
              :rows="field.rows ?? 2"
              :disabled="!isEnabled(field)"
            ></textarea>
            <input
              v-else
              v-model="draft[field.key]"
              :type="fieldType(field)"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :disabled="!isEnabled(field)"
            />
          </template>
        </div>
      </template>
      <div class="form-row">
        <button
          data-testid="apply-props"
          class="btn btn-primary"
          @click="apply"
        >
          应用
        </button>
      </div>
    </div>
  </aside>
</template>
