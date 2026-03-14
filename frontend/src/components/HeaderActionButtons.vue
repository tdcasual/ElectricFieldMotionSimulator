<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    isPhoneLayout: boolean;
    showAuthoringControls: boolean;
    running: boolean;
    classroomMode: boolean;
    variablesPanelOpen: boolean;
    markdownBoardOpen: boolean;
    demoMode: boolean;
    demoButtonTitle: string;
    demoButtonLabel: string;
    useUtilityTray?: boolean;
    sceneTrayOpen?: boolean;
    settingsTrayOpen?: boolean;
  }>(),
  {
    useUtilityTray: true,
    sceneTrayOpen: false,
    settingsTrayOpen: false
  }
);

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
  (event: 'toggle-scene-tray'): void;
  (event: 'toggle-settings-tray'): void;
}>();
</script>

<template>
  <div class="header-actions">
    <div class="header-action-group header-action-group--primary" data-testid="header-primary-actions">
      <span v-if="!props.isPhoneLayout" class="header-group-label" data-testid="header-primary-label">主控</span>
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
      <button id="reset-btn" class="btn btn-subtle" title="回到起始态" aria-label="回到起始态" @click="emit('reset-scene')">🔄 回到起始态</button>
      <button
        v-if="props.showAuthoringControls && !props.isPhoneLayout"
        id="classroom-mode-btn"
        class="btn"
        :class="props.classroomMode ? 'btn-primary' : 'btn-subtle'"
        title="课堂演示模式"
        aria-label="课堂演示模式"
        :aria-pressed="props.classroomMode ? 'true' : 'false'"
        @click="emit('toggle-classroom')"
      >
        {{ props.classroomMode ? '退出课堂' : '课堂演示' }}
      </button>
    </div>
    <template v-if="props.showAuthoringControls && !props.isPhoneLayout">
      <div v-if="props.useUtilityTray" class="header-action-group header-action-group--utility" data-testid="header-utility-actions">
        <span v-if="!props.isPhoneLayout" class="header-group-label" data-testid="header-utility-label">扩展</span>
        <button
          id="scene-tray-toggle-btn"
          class="btn"
          :class="props.sceneTrayOpen ? 'btn-primary' : 'btn-subtle'"
          title="切换场景文件托盘"
          aria-label="切换场景文件托盘"
          :aria-expanded="props.sceneTrayOpen ? 'true' : 'false'"
          @click="emit('toggle-scene-tray')"
        >
          场景文件
        </button>
        <button
          id="settings-tray-toggle-btn"
          class="btn"
          :class="props.settingsTrayOpen ? 'btn-primary' : 'btn-subtle'"
          title="切换场景参数托盘"
          aria-label="切换场景参数托盘"
          :aria-expanded="props.settingsTrayOpen ? 'true' : 'false'"
          @click="emit('toggle-settings-tray')"
        >
          场景参数
        </button>
      </div>
      <div v-else class="header-action-group header-action-group--scene" data-testid="header-scene-actions">
        <span v-if="!props.isPhoneLayout" class="header-group-label" data-testid="header-scene-label">场景</span>
        <button id="save-btn" class="btn btn-subtle" title="保存场景" aria-label="保存场景" @click="emit('save-scene')">💾 保存</button>
        <button id="load-btn" class="btn btn-subtle" title="加载场景" aria-label="加载场景" @click="emit('load-scene')">📂 读取</button>
        <button id="export-btn" class="btn btn-subtle" title="导出场景" aria-label="导出场景" @click="emit('export-scene')">📤 导出</button>
        <button id="import-btn" class="btn btn-subtle" title="导入场景" aria-label="导入场景" @click="emit('open-import')">📥 导入</button>
        <button id="clear-btn" class="btn btn-subtle" title="清空场景" aria-label="清空场景" @click="emit('clear-scene')">🗑 清空</button>
      </div>
      <div class="header-action-group header-action-group--teaching" data-testid="header-teaching-actions">
        <span v-if="!props.isPhoneLayout" class="header-group-label" data-testid="header-teaching-label">教学</span>
        <button id="theme-toggle-btn" class="btn btn-subtle" title="切换主题" aria-label="切换主题" @click="emit('toggle-theme')">
          <span data-theme-icon>🌙</span>
          <span data-theme-label>主题</span>
        </button>
        <button
          id="variables-btn"
          class="btn"
          :class="props.variablesPanelOpen ? 'btn-primary' : 'btn-subtle'"
          title="变量表"
          aria-label="变量表"
          :aria-pressed="props.variablesPanelOpen ? 'true' : 'false'"
          @click="emit('open-variables')"
        >
          ƒx 变量
        </button>
        <button
          id="markdown-toggle-btn"
          class="btn"
          :class="props.markdownBoardOpen ? 'btn-primary' : 'btn-subtle'"
          title="题目板"
          aria-label="题目板"
          :aria-pressed="props.markdownBoardOpen ? 'true' : 'false'"
          @click="emit('toggle-markdown')"
        >
          📝 题板
        </button>
        <button
          id="demo-mode-btn"
          class="btn"
          :class="props.demoMode ? 'btn-primary' : 'btn-subtle'"
          :title="props.demoButtonTitle"
          aria-label="演示模式"
          :aria-pressed="props.demoMode ? 'true' : 'false'"
          @click="emit('toggle-demo')"
        >
          {{ props.demoButtonLabel }}
        </button>
      </div>
    </template>
  </div>
</template>
