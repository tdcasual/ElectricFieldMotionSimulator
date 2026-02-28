<script setup lang="ts">
const props = defineProps<{
  isPhoneLayout: boolean;
  showAuthoringControls: boolean;
  running: boolean;
  classroomMode: boolean;
  variablesPanelOpen: boolean;
  markdownBoardOpen: boolean;
  demoMode: boolean;
  demoButtonTitle: string;
  demoButtonLabel: string;
}>();

const emit = defineEmits<{
  (event: 'toggle-play'): void;
  (event: 'toggle-classroom'): void;
  (event: 'reset-scene'): void;
  (event: 'clear-scene'): void;
  (event: 'save-scene'): void;
  (event: 'load-scene'): void;
  (event: 'export-scene'): void;
  (event: 'open-import'): void;
  (event: 'toggle-theme'): void;
  (event: 'open-variables'): void;
  (event: 'toggle-markdown'): void;
  (event: 'toggle-demo'): void;
}>();
</script>

<template>
  <div class="header-actions">
    <button
      v-if="!props.isPhoneLayout || !props.showAuthoringControls"
      id="play-pause-btn"
      class="btn btn-primary"
      title="播放/暂停"
      aria-label="播放/暂停"
      @click="emit('toggle-play')"
    >
      <span id="play-icon">{{ props.running ? '⏸' : '▶' }}</span>
      <span id="play-label">{{ props.running ? '暂停' : '播放' }}</span>
    </button>
    <button
      v-if="props.showAuthoringControls && !props.isPhoneLayout"
      id="classroom-mode-btn"
      class="btn"
      :class="{ 'btn-primary': props.classroomMode }"
      title="课堂演示模式"
      aria-label="课堂演示模式"
      :aria-pressed="props.classroomMode ? 'true' : 'false'"
      @click="emit('toggle-classroom')"
    >
      {{ props.classroomMode ? '退出课堂' : '课堂演示' }}
    </button>
    <button id="reset-btn" class="btn" title="回到起始态" aria-label="回到起始态" @click="emit('reset-scene')">🔄 回到起始态</button>
    <template v-if="props.showAuthoringControls">
      <button v-if="!props.isPhoneLayout" id="clear-btn" class="btn" title="清空场景" aria-label="清空场景" @click="emit('clear-scene')">🗑 清空</button>
      <button v-if="!props.isPhoneLayout" id="save-btn" class="btn" title="保存场景" aria-label="保存场景" @click="emit('save-scene')">💾 保存</button>
      <button v-if="!props.isPhoneLayout" id="load-btn" class="btn" title="加载场景" aria-label="加载场景" @click="emit('load-scene')">📂 读取</button>
      <button v-if="!props.isPhoneLayout" id="export-btn" class="btn" title="导出场景" aria-label="导出场景" @click="emit('export-scene')">📤 导出</button>
      <button v-if="!props.isPhoneLayout" id="import-btn" class="btn" title="导入场景" aria-label="导入场景" @click="emit('open-import')">📥 导入</button>
      <button v-if="!props.isPhoneLayout" id="theme-toggle-btn" class="btn" title="切换主题" aria-label="切换主题" @click="emit('toggle-theme')">🌙 主题</button>
      <button
        v-if="!props.isPhoneLayout"
        id="variables-btn"
        class="btn"
        :class="{ 'btn-primary': props.variablesPanelOpen }"
        title="变量表"
        aria-label="变量表"
        :aria-pressed="props.variablesPanelOpen ? 'true' : 'false'"
        @click="emit('open-variables')"
      >
        ƒx 变量
      </button>
      <button
        v-if="!props.isPhoneLayout"
        id="markdown-toggle-btn"
        class="btn"
        :class="{ 'btn-primary': props.markdownBoardOpen }"
        title="题目板"
        aria-label="题目板"
        :aria-pressed="props.markdownBoardOpen ? 'true' : 'false'"
        @click="emit('toggle-markdown')"
      >
        📝 题板
      </button>
      <button
        v-if="!props.isPhoneLayout"
        id="demo-mode-btn"
        class="btn"
        :class="{ 'btn-primary': props.demoMode }"
        :title="props.demoButtonTitle"
        aria-label="演示模式"
        :aria-pressed="props.demoMode ? 'true' : 'false'"
        @click="emit('toggle-demo')"
      >
        {{ props.demoButtonLabel }}
      </button>
    </template>
  </div>
</template>
