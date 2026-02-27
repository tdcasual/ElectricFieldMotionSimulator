<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

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
      'drawer-host--sheet': hasBackdrop.value && isPhoneLayout.value
    }
  ]);

const hostStyle = computed(() => {
  if (props.modelValue || !props.keepMounted) return undefined;
  return { display: 'none' };
});

const backdropPointerId = ref<number | null>(null);
const hostRef = ref<HTMLElement | null>(null);

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

function getFocusableElements() {
  const root = hostRef.value;
  if (!root) return [];
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  });
}

function focusFirstFocusable() {
  const elements = getFocusableElements();
  if (elements.length > 0) {
    elements[0].focus();
    return true;
  }
  if (hostRef.value) {
    hostRef.value.focus();
    return true;
  }
  return false;
}

function handleKeydown(event: KeyboardEvent) {
  if (!hasBackdrop.value || !props.modelValue) return;
  if (event.key === 'Escape') {
    if (!props.closeOnBackdrop) return;
    close();
    return;
  }
  if (event.key !== 'Tab') return;

  const elements = getFocusableElements();
  if (elements.length === 0) {
    event.preventDefault();
    hostRef.value?.focus();
    return;
  }

  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey) {
    if (active === first || !active || !hostRef.value?.contains(active)) {
      event.preventDefault();
      last.focus();
    }
    return;
  }

  if (active === last || !active || !hostRef.value?.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => [props.modelValue, hasBackdrop.value] as const,
  async ([open, backdrop]) => {
    if (!open || !backdrop) return;
    await nextTick();
    const active = document.activeElement as HTMLElement | null;
    if (active && hostRef.value?.contains(active)) return;
    focusFirstFocusable();
  },
  { immediate: true }
);
</script>

<template>
  <div
    v-if="shouldRender"
    ref="hostRef"
    :data-testid="props.testId"
    :class="hostClasses"
    :style="hostStyle"
    tabindex="-1"
    @pointerdown="handlePointerDown"
    @pointerup="handlePointerUp"
    @pointercancel="clearPointerState"
    @pointerleave="clearPointerState"
    @keydown="handleKeydown"
  >
    <slot />
  </div>
</template>
