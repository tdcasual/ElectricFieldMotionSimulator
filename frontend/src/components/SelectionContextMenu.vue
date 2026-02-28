<script setup lang="ts">
const emit = defineEmits<{
  (event: 'open-properties'): void;
  (event: 'duplicate'): void;
  (event: 'delete'): void;
}>();
</script>

<template>
  <div id="context-menu" class="context-menu" style="display: none">
    <div id="menu-properties" class="menu-item" @click="emit('open-properties')">⚙️ 属性</div>
    <div id="menu-duplicate" class="menu-item" @click="emit('duplicate')">📋 复制</div>
    <div class="menu-separator"></div>
    <div id="menu-delete" class="menu-item" @click="emit('delete')">🗑️ 删除</div>
  </div>
</template>
