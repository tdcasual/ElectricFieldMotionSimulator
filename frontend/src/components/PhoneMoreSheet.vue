<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import { createSwipeCloseGesture } from '../utils/swipeCloseGesture';

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'export-scene'): void;
  (event: 'open-import'): void;
  (event: 'toggle-theme'): void;
  (event: 'save-scene'): void;
  (event: 'load-scene'): void;
  (event: 'clear-scene'): void;
  (event: 'open-variables'): void;
  (event: 'toggle-markdown'): void;
}>();

const swipeGesture = createSwipeCloseGesture(() => {
  emit('close');
});

onBeforeUnmount(() => {
  swipeGesture.dispose();
});
</script>

<template>
  <section class="phone-sheet phone-more-sheet" data-testid="phone-more-sheet" aria-label="更多操作面板">
    <div
      class="phone-sheet-header"
      @pointerdown="swipeGesture.onPointerDown"
      @pointerup="swipeGesture.onPointerUp"
      @pointercancel="swipeGesture.onPointerCancel"
    >
      <h3>更多操作</h3>
      <button type="button" class="btn-icon" aria-label="关闭更多操作面板" @click="emit('close')">✖</button>
    </div>
    <div class="phone-sheet-body phone-more-body">
      <section class="phone-more-section" aria-label="场景文件">
        <p class="phone-more-section-title">场景文件</p>
        <div class="phone-more-grid">
          <button id="secondary-save-btn" class="btn btn-primary" type="button" @click="emit('save-scene')">💾 保存场景</button>
          <button id="secondary-load-btn" class="btn" type="button" @click="emit('load-scene')">📂 读取场景</button>
          <button id="secondary-export-btn" class="btn" type="button" @click="emit('export-scene')">📤 导出场景</button>
          <button id="secondary-import-btn" class="btn" type="button" @click="emit('open-import')">📥 导入场景</button>
          <button id="secondary-clear-btn" class="btn object-action-danger phone-more-danger" type="button" @click="emit('clear-scene')">🗑 清空场景</button>
        </div>
      </section>
      <section class="phone-more-section" aria-label="界面工具">
        <p class="phone-more-section-title">界面工具</p>
        <div class="phone-more-grid">
          <button id="secondary-variables-btn" class="btn" type="button" @click="emit('open-variables')">ƒx 变量表</button>
          <button id="secondary-markdown-btn" class="btn" type="button" @click="emit('toggle-markdown')">📝 题板</button>
          <button id="secondary-theme-btn" class="btn" type="button" @click="emit('toggle-theme')">🌙 切换主题</button>
        </div>
      </section>
    </div>
  </section>
</template>
