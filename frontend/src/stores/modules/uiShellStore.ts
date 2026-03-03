import { ref } from 'vue';
import type { EmbedMode } from '../../embed/embedConfig';
import type { ToolbarGroup, UiShellStateRefs } from './types';

const DEFAULT_STATUS = 'V3 Runtime Ready';

const TOOLBAR_GROUPS: ToolbarGroup[] = [
  {
    key: 'electric',
    label: '电场',
    entries: [{ type: 'electric-field', label: '电场区域' }]
  },
  {
    key: 'magnetic',
    label: '磁场',
    entries: [{ type: 'magnetic-field', label: '磁场区域' }]
  },
  {
    key: 'particle',
    label: '粒子',
    entries: [{ type: 'particle', label: '带电粒子' }]
  }
];

type CreateUiShellModuleOptions = {
  onEnterViewMode?: () => void;
  defaultStatus?: string;
};

export function createUiShellModule(options: CreateUiShellModuleOptions = {}) {
  const hostMode = ref<EmbedMode>('edit');
  const toolbarGroups = ref<ToolbarGroup[]>(TOOLBAR_GROUPS);
  const statusText = ref(options.defaultStatus ?? DEFAULT_STATUS);

  function setStatusText(text: string) {
    statusText.value = String(text || (options.defaultStatus ?? DEFAULT_STATUS));
  }

  function setHostMode(next: EmbedMode) {
    hostMode.value = next === 'view' ? 'view' : 'edit';
    if (hostMode.value === 'view') {
      options.onEnterViewMode?.();
    }
  }

  const state: UiShellStateRefs = {
    hostMode,
    toolbarGroups,
    statusText
  };

  return {
    ...state,
    setStatusText,
    setHostMode
  };
}
