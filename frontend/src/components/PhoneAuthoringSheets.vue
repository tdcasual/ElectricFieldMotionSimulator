<script setup lang="ts">
import PhoneAddSheet from './PhoneAddSheet.vue';
import PhoneMoreSheet from './PhoneMoreSheet.vue';
import PhoneSceneSheet from './PhoneSceneSheet.vue';
import PhoneSelectedSheet from './PhoneSelectedSheet.vue';
import type { PhoneGeometryRow } from '../modes/phoneGeometry';

type BoundaryMode = 'margin' | 'remove' | 'bounce' | 'wrap';

type ToolbarEntry = {
  type: string;
  label: string;
  icon?: string | null;
};

type ToolbarGroup = {
  key: string;
  label: string;
  entries: ToolbarEntry[];
};

const props = defineProps<{
  showAuthoringControls: boolean;
  isPhoneLayout: boolean;
  phoneAddSheetOpen: boolean;
  phoneSelectedSheetOpen: boolean;
  phoneSceneSheetOpen: boolean;
  phoneMoreSheetOpen: boolean;
  phoneAnySheetOpen: boolean;
  toolbarGroups: ToolbarGroup[];
  selectedObjectId: string | null;
  propertyTitle: string;
  phoneSelectedScale: number;
  phoneSelectedGeometryRows: PhoneGeometryRow[];
  showEnergyOverlay: boolean;
  pixelsPerMeter: number;
  gravity: number;
  boundaryMode: BoundaryMode;
  showBoundaryMarginControl: boolean;
  boundaryMargin: number;
  timeStep: number;
  timeStepLabel: string;
  demoMode: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'create-object', type: string): void;
  (event: 'load-preset', name: string): void;
  (event: 'open-selected-properties'): void;
  (event: 'duplicate-selected'): void;
  (event: 'delete-selected'): void;
  (event: 'update-phone-selected-value', payload: { key: string; value: string }): void;
  (event: 'set-show-energy', payload: Event): void;
  (event: 'set-pixels-per-meter', payload: Event): void;
  (event: 'set-gravity', payload: Event): void;
  (event: 'set-boundary-mode', payload: Event): void;
  (event: 'set-boundary-margin', payload: Event): void;
  (event: 'set-time-step', payload: Event): void;
  (event: 'export-scene'): void;
  (event: 'open-import'): void;
  (event: 'toggle-theme'): void;
  (event: 'save-scene'): void;
  (event: 'load-scene'): void;
  (event: 'clear-scene'): void;
  (event: 'open-variables'): void;
  (event: 'toggle-markdown'): void;
}>();
</script>

<template>
  <PhoneAddSheet
    v-if="props.showAuthoringControls && props.isPhoneLayout && props.phoneAddSheetOpen"
    :groups="props.toolbarGroups"
    @close="emit('close')"
    @create="(type) => emit('create-object', type)"
    @load-preset="(name) => emit('load-preset', name)"
  />
  <PhoneSelectedSheet
    v-if="props.showAuthoringControls && props.isPhoneLayout && props.phoneSelectedSheetOpen"
    :selected-object-id="props.selectedObjectId"
    :title="props.propertyTitle || '选中对象'"
    :object-scale="props.phoneSelectedScale"
    :geometry-rows="props.phoneSelectedGeometryRows"
    @close="emit('close')"
    @open-properties="emit('open-selected-properties')"
    @duplicate="emit('duplicate-selected')"
    @delete="emit('delete-selected')"
    @update-value="(payload) => emit('update-phone-selected-value', payload)"
  />
  <PhoneSceneSheet
    v-if="props.showAuthoringControls && props.isPhoneLayout && props.phoneSceneSheetOpen"
    :show-energy-overlay="props.showEnergyOverlay"
    :pixels-per-meter="props.pixelsPerMeter"
    :gravity="props.gravity"
    :boundary-mode="props.boundaryMode"
    :show-boundary-margin-control="props.showBoundaryMarginControl"
    :boundary-margin="props.boundaryMargin"
    :time-step="props.timeStep"
    :time-step-label="props.timeStepLabel"
    :demo-mode="props.demoMode"
    @close="emit('close')"
    @set-show-energy="(event) => emit('set-show-energy', event)"
    @set-pixels-per-meter="(event) => emit('set-pixels-per-meter', event)"
    @set-gravity="(event) => emit('set-gravity', event)"
    @set-boundary-mode="(event) => emit('set-boundary-mode', event)"
    @set-boundary-margin="(event) => emit('set-boundary-margin', event)"
    @set-time-step="(event) => emit('set-time-step', event)"
  />
  <PhoneMoreSheet
    v-if="props.showAuthoringControls && props.isPhoneLayout && props.phoneMoreSheetOpen"
    @close="emit('close')"
    @export-scene="emit('export-scene')"
    @open-import="emit('open-import')"
    @toggle-theme="emit('toggle-theme')"
    @save-scene="emit('save-scene')"
    @load-scene="emit('load-scene')"
    @clear-scene="emit('clear-scene')"
    @open-variables="emit('open-variables')"
    @toggle-markdown="emit('toggle-markdown')"
  />
  <button
    v-if="props.showAuthoringControls && props.isPhoneLayout && props.phoneAnySheetOpen"
    type="button"
    class="phone-sheet-backdrop"
    aria-label="关闭手机面板"
    @click="emit('close')"
  ></button>
</template>
