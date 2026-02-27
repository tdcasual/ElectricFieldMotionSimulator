<script setup lang="ts">
const emit = defineEmits<{
  (event: 'open-properties'): void;
  (event: 'duplicate'): void;
  (event: 'delete'): void;
}>();
</script>

<template>
  <div class="object-action-bar" data-testid="object-action-bar" role="toolbar" aria-label="对象操作">
    <button
      class="btn object-action-btn"
      data-testid="action-open-properties"
      type="button"
      @click="emit('open-properties')"
    >
      属性
    </button>
    <button
      class="btn object-action-btn"
      data-testid="action-duplicate"
      type="button"
      @click="emit('duplicate')"
    >
      复制
    </button>
    <button
      class="btn object-action-btn object-action-danger"
      data-testid="action-delete"
      type="button"
      @click="emit('delete')"
    >
      删除
    </button>
  </div>
</template>
