<script setup lang="ts">
type PhoneSheetKey = 'add' | 'selected' | 'scene' | 'more' | null;

const props = withDefaults(
  defineProps<{
    modelValue: PhoneSheetKey;
    running?: boolean;
    hasSelection?: boolean;
  }>(),
  {
    modelValue: null,
    running: false,
    hasSelection: false
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: PhoneSheetKey): void;
  (event: 'toggle-play'): void;
}>();

function toggleSheet(target: Exclude<PhoneSheetKey, null>) {
  if (target === 'selected' && !props.hasSelection) return;
  const next = props.modelValue === target ? null : target;
  emit('update:modelValue', next);
}
</script>

<template>
  <nav id="phone-bottom-nav" class="phone-bottom-nav" data-testid="phone-bottom-nav" aria-label="手机快捷导航">
    <button
      id="phone-nav-add-btn"
      type="button"
      class="phone-nav-btn"
      :class="{ active: props.modelValue === 'add' }"
      :aria-pressed="props.modelValue === 'add' ? 'true' : 'false'"
      @click="toggleSheet('add')"
    >
      添加
    </button>
    <button
      id="phone-nav-selected-btn"
      type="button"
      class="phone-nav-btn"
      :class="{ active: props.modelValue === 'selected' }"
      :aria-pressed="props.modelValue === 'selected' ? 'true' : 'false'"
      :disabled="!props.hasSelection"
      @click="toggleSheet('selected')"
    >
      选中
    </button>
    <button
      id="phone-nav-play-btn"
      type="button"
      class="phone-nav-btn phone-nav-btn-primary"
      :aria-pressed="props.running ? 'true' : 'false'"
      @click="emit('toggle-play')"
    >
      {{ props.running ? '暂停' : '播放' }}
    </button>
    <button
      id="phone-nav-scene-btn"
      type="button"
      class="phone-nav-btn"
      :class="{ active: props.modelValue === 'scene' }"
      :aria-pressed="props.modelValue === 'scene' ? 'true' : 'false'"
      @click="toggleSheet('scene')"
    >
      场景
    </button>
    <button
      id="phone-nav-more-btn"
      type="button"
      class="phone-nav-btn"
      :class="{ active: props.modelValue === 'more' }"
      :aria-pressed="props.modelValue === 'more' ? 'true' : 'false'"
      @click="toggleSheet('more')"
    >
      更多
    </button>
  </nav>
</template>
