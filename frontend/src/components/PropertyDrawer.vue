<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import DrawerHost from './DrawerHost.vue';

type SchemaField = {
  key: string;
  label?: string;
  type?: string;
  unit?: string;
  geometryRole?: 'real' | 'display';
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
  group?: 'basic' | 'advanced';
  defaultCollapsed?: boolean;
  fields?: SchemaField[];
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    layoutMode?: 'desktop' | 'tablet' | 'phone';
    densityMode?: 'compact' | 'comfortable';
    sections?: SchemaSection[];
    values?: Record<string, unknown>;
  }>(),
  {
    title: '属性面板',
    layoutMode: 'desktop',
    densityMode: 'compact',
    sections: () => [],
    values: () => ({})
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'apply', values: Record<string, unknown>): void;
  (event: 'toggle-density'): void;
}>();

const draft = reactive<Record<string, unknown>>({});
const sectionOpenState = reactive<Record<number, boolean>>({});
const MAX_QUICK_FIELDS = 4;

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

function resolveDefaultOpen(section: SchemaSection, index: number) {
  if (typeof section.defaultCollapsed === 'boolean') {
    return !section.defaultCollapsed;
  }
  if (section.group === 'advanced') {
    return false;
  }
  return index < 2;
}

function resetSectionOpenState(nextSections: SchemaSection[]) {
  for (const key of Object.keys(sectionOpenState)) {
    delete sectionOpenState[Number(key)];
  }
  nextSections.forEach((section, index) => {
    sectionOpenState[index] = resolveDefaultOpen(section, index);
  });
}

watch(
  () => props.sections,
  (next) => {
    resetSectionOpenState(Array.isArray(next) ? next : []);
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

function isSectionOpen(index: number) {
  return sectionOpenState[index] !== false;
}

function toggleSection(index: number) {
  sectionOpenState[index] = !isSectionOpen(index);
}

function sectionTitle(section: SchemaSection, index: number) {
  return section.title || `分组 ${index + 1}`;
}

function handleContentWheel(event: WheelEvent) {
  event.stopPropagation();
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.type !== 'number') return;

  const container = event.currentTarget;
  if (!(container instanceof HTMLElement)) return;

  event.preventDefault();
  container.scrollTop += event.deltaY;
}

const densityLabel = computed(() => {
  if (props.densityMode === 'comfortable') return '密度: 舒适';
  return '密度: 紧凑';
});

const quickFields = computed<SchemaField[]>(() => {
  if (props.layoutMode !== 'phone') return [];

  const candidateFields: SchemaField[] = [];
  for (const section of props.sections ?? []) {
    for (const field of section.fields ?? []) {
      if (!field?.key) continue;
      if (field.geometryRole === 'display') continue;
      if (field.multiline) continue;
      if (field.type === 'checkbox') continue;
      candidateFields.push(field);
    }
  }

  return candidateFields.filter((field) => isVisible(field)).slice(0, MAX_QUICK_FIELDS);
});
</script>

<template>
  <DrawerHost
    :model-value="props.modelValue"
    keep-mounted
    variant="property"
    :layout-mode="props.layoutMode"
    backdrop="phone"
    :close-on-backdrop="true"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <aside
      id="property-panel"
      class="panel"
      :class="{ open: props.modelValue, 'panel-sheet': props.layoutMode === 'phone' }"
      data-testid="property-drawer"
      @wheel.stop
    >
      <div class="panel-header">
        <h3>{{ props.title }}</h3>
        <div class="panel-header-actions">
          <button
            v-if="props.layoutMode === 'phone'"
            type="button"
            class="btn"
            data-testid="density-toggle"
            @click="emit('toggle-density')"
          >
            {{ densityLabel }}
          </button>
          <button id="close-panel-btn" class="btn-icon" aria-label="关闭属性面板" @click="close">✖</button>
        </div>
      </div>
      <div id="property-content" class="panel-content" @wheel="handleContentWheel">
        <section v-if="quickFields.length" class="property-section" data-testid="property-quick-edit">
          <div class="property-quick-title">快捷编辑</div>
          <dl class="property-rows">
            <template v-for="field in quickFields" :key="`quick-${field.key}`">
              <dt class="property-key">
                <label :for="`quick-${field.key}`">{{ field.label ?? field.key }}</label>
              </dt>
              <dd class="property-value" data-testid="quick-field">
                <input
                  v-if="field.type === 'checkbox'"
                  :id="`quick-${field.key}`"
                  v-model="draft[field.key]"
                  type="checkbox"
                  :disabled="!isEnabled(field)"
                />
                <select
                  v-else-if="field.type === 'select'"
                  :id="`quick-${field.key}`"
                  v-model="draft[field.key]"
                  :disabled="!isEnabled(field)"
                >
                  <option v-for="option in field.options ?? []" :key="String(option.value)" :value="option.value">
                    {{ option.label ?? String(option.value) }}
                  </option>
                </select>
                <input
                  v-else
                  :id="`quick-${field.key}`"
                  v-model="draft[field.key]"
                  :type="fieldType(field)"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step"
                  :disabled="!isEnabled(field)"
                />
              </dd>
            </template>
          </dl>
        </section>
        <section
          v-for="(section, sectionIndex) in props.sections"
          :key="`section-${sectionIndex}`"
          class="property-section"
        >
          <button
            type="button"
            class="section-toggle"
            :data-testid="`section-toggle-${sectionIndex}`"
            :aria-expanded="isSectionOpen(sectionIndex) ? 'true' : 'false'"
            @click="toggleSection(sectionIndex)"
          >
            <span>{{ sectionTitle(section, sectionIndex) }}</span>
            <span>{{ isSectionOpen(sectionIndex) ? '收起' : '展开' }}</span>
          </button>
          <div v-if="isSectionOpen(sectionIndex)">
            <dl class="property-rows">
              <template v-for="field in section.fields ?? []" :key="field.key">
                <dt class="property-key" :style="{ display: isVisible(field) ? '' : 'none' }">
                  <label :for="`prop-${sectionIndex}-${field.key}`">{{ field.label ?? field.key }}</label>
                </dt>
                <dd class="property-value" :style="{ display: isVisible(field) ? '' : 'none' }">
                  <input
                    v-if="field.type === 'checkbox'"
                    :id="`prop-${sectionIndex}-${field.key}`"
                    v-model="draft[field.key]"
                    type="checkbox"
                    :disabled="!isEnabled(field)"
                  />
                  <select
                    v-else-if="field.type === 'select'"
                    :id="`prop-${sectionIndex}-${field.key}`"
                    v-model="draft[field.key]"
                    :disabled="!isEnabled(field)"
                  >
                    <option v-for="option in field.options ?? []" :key="String(option.value)" :value="option.value">
                      {{ option.label ?? String(option.value) }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="field.multiline"
                    :id="`prop-${sectionIndex}-${field.key}`"
                    v-model="draft[field.key]"
                    :rows="field.rows ?? 2"
                    :disabled="!isEnabled(field)"
                  ></textarea>
                  <input
                    v-else
                    :id="`prop-${sectionIndex}-${field.key}`"
                    v-model="draft[field.key]"
                    :type="fieldType(field)"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step"
                    :disabled="!isEnabled(field)"
                  />
                </dd>
              </template>
            </dl>
          </div>
        </section>
      </div>
      <div class="panel-actions">
        <button
          data-testid="apply-props"
          class="btn btn-primary"
          @click="apply"
        >
          应用
        </button>
      </div>
    </aside>
  </DrawerHost>
</template>
