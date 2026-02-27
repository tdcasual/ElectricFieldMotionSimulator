<script setup lang="ts">
import { computed, ref } from 'vue';

type LayoutMode = 'desktop' | 'tablet' | 'phone';
type DrawerVariant = 'property' | 'variables' | 'markdown';
type BackdropMode = 'never' | 'phone' | 'always';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    keepMounted?: boolean;
    variant?: DrawerVariant;
    layoutMode?: LayoutMode;
    backdrop?: BackdropMode;
    closeOnBackdrop?: boolean;
    testId?: string;
  }>(),
  {
    keepMounted: false,
    variant: 'property',
    layoutMode: 'desktop',
    backdrop: 'never',
    closeOnBackdrop: false,
    testId: 'drawer-host'
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'close'): void;
}>();

const shouldRender = computed(() => props.modelValue || props.keepMounted);
const isPhoneLayout = computed(() => props.layoutMode === 'phone');
const hasBackdrop = computed(() => {
  if (props.backdrop === 'always') return true;
  if (props.backdrop === 'phone') return isPhoneLayout.value;
  return false;
});

const hostClasses = computed(() => [
  'drawer-host',
  `drawer-host--${props.variant}`,
  `drawer-host--${props.layoutMode}`,
  {
    'drawer-host--open': props.modelValue,
    'drawer-host--backdrop': hasBackdrop.value,
    'modal-overlay': hasBackdrop.value,
    'phone-sheet': hasBackdrop.value && isPhoneLayout.value
  }
]);

const hostStyle = computed(() => {
  if (props.modelValue || !props.keepMounted) return undefined;
  return { display: 'none' };
});

const backdropPointerId = ref<number | null>(null);

function close() {
  emit('close');
  emit('update:modelValue', false);
}

function isBackdropTarget(event: PointerEvent) {
  return event.target === event.currentTarget;
}

function handlePointerDown(event: PointerEvent) {
  backdropPointerId.value = null;
  if (!hasBackdrop.value || !props.closeOnBackdrop) return;
  if (!isBackdropTarget(event)) return;
  backdropPointerId.value = event.pointerId;
}

function handlePointerUp(event: PointerEvent) {
  if (!hasBackdrop.value || !props.closeOnBackdrop) return;
  if (!isBackdropTarget(event)) return;
  if (backdropPointerId.value !== event.pointerId) return;
  backdropPointerId.value = null;
  close();
}

function clearPointerState() {
  backdropPointerId.value = null;
}
</script>

<template>
  <div
    v-if="shouldRender"
    :data-testid="props.testId"
    :class="hostClasses"
    :style="hostStyle"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="clearPointerState"
    @pointerleave="clearPointerState"
  >
    <slot />
  </div>
</template>
