<script setup lang="ts">
import MarkdownBoard from './MarkdownBoard.vue';
import PropertyDrawer from './PropertyDrawer.vue';
import VariablesPanel from './VariablesPanel.vue';

type LayoutMode = 'desktop' | 'tablet' | 'phone';
type PhoneDensityMode = 'compact' | 'comfortable';
type MarkdownMode = 'edit' | 'preview';

const props = defineProps<{
  showAuthoringControls: boolean;
  propertyDrawerModel: boolean;
  propertyTitle: string;
  layoutMode: LayoutMode;
  propertySections: unknown[];
  propertyValues: Record<string, unknown>;
  densityMode: PhoneDensityMode;
  markdownBoardModel: boolean;
  markdownContent: string;
  markdownMode: MarkdownMode;
  markdownFontSize: number;
  variablesPanelModel: boolean;
  variableDraft: Record<string, number>;
}>();

const emit = defineEmits<{
  (event: 'update:property-drawer-model', next: boolean): void;
  (event: 'toggle-density'): void;
  (event: 'apply-properties', values: Record<string, unknown>): void;
  (event: 'update:markdown-board-model', next: boolean): void;
  (event: 'update:markdown-content', next: string): void;
  (event: 'update:markdown-mode', next: MarkdownMode): void;
  (event: 'update:markdown-font-size', next: number): void;
  (event: 'update:variables-panel-model', next: boolean): void;
  (event: 'apply-variables', values: Record<string, number>): void;
}>();
</script>

<template>
  <PropertyDrawer
    v-if="props.showAuthoringControls"
    :model-value="props.propertyDrawerModel"
    :title="props.propertyTitle"
    :layout-mode="props.layoutMode"
    :sections="props.propertySections"
    :values="props.propertyValues"
    :density-mode="props.densityMode"
    @update:model-value="(next) => emit('update:property-drawer-model', next)"
    @toggle-density="emit('toggle-density')"
    @apply="(values) => emit('apply-properties', values)"
  />
  <MarkdownBoard
    v-if="props.showAuthoringControls"
    :model-value="props.markdownBoardModel"
    :layout-mode="props.layoutMode"
    :content="props.markdownContent"
    :mode="props.markdownMode"
    :font-size="props.markdownFontSize"
    @update:model-value="(next) => emit('update:markdown-board-model', next)"
    @update:content="(next) => emit('update:markdown-content', next)"
    @update:mode="(next) => emit('update:markdown-mode', next)"
    @update:fontSize="(next) => emit('update:markdown-font-size', next)"
  />
  <VariablesPanel
    v-if="props.showAuthoringControls"
    :model-value="props.variablesPanelModel"
    :layout-mode="props.layoutMode"
    :variables="props.variableDraft"
    @update:model-value="(next) => emit('update:variables-panel-model', next)"
    @apply="(values) => emit('apply-variables', values)"
  />
</template>
