import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AuthoringPanels from '../src/components/AuthoringPanels.vue';
import MarkdownBoard from '../src/components/MarkdownBoard.vue';
import PropertyDrawer from '../src/components/PropertyDrawer.vue';
import VariablesPanel from '../src/components/VariablesPanel.vue';

function mountPanels(overrides: Record<string, unknown> = {}) {
  return mount(AuthoringPanels, {
    props: {
      showAuthoringControls: true,
      propertyDrawerModel: false,
      propertyTitle: '属性面板',
      layoutMode: 'desktop',
      propertySections: [],
      propertyValues: {},
      densityMode: 'compact',
      markdownBoardModel: false,
      markdownContent: '# 标题',
      markdownMode: 'preview',
      markdownFontSize: 16,
      variablesPanelModel: false,
      variableDraft: {},
      ...overrides
    }
  });
}

describe('AuthoringPanels', () => {
  it('forwards events from property/markdown/variables panels', async () => {
    const wrapper = mountPanels();

    wrapper.findComponent(PropertyDrawer).vm.$emit('update:modelValue', true);
    wrapper.findComponent(PropertyDrawer).vm.$emit('toggle-density');
    wrapper.findComponent(PropertyDrawer).vm.$emit('apply', { radius: 3 });

    wrapper.findComponent(MarkdownBoard).vm.$emit('update:modelValue', true);
    wrapper.findComponent(MarkdownBoard).vm.$emit('update:content', '# 新内容');
    wrapper.findComponent(MarkdownBoard).vm.$emit('update:mode', 'edit');
    wrapper.findComponent(MarkdownBoard).vm.$emit('update:fontSize', 18);

    wrapper.findComponent(VariablesPanel).vm.$emit('update:modelValue', true);
    wrapper.findComponent(VariablesPanel).vm.$emit('apply', { a: 1 });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:property-drawer-model')).toEqual([[true]]);
    expect(wrapper.emitted('toggle-density')).toHaveLength(1);
    expect(wrapper.emitted('apply-properties')).toEqual([[{ radius: 3 }]]);

    expect(wrapper.emitted('update:markdown-board-model')).toEqual([[true]]);
    expect(wrapper.emitted('update:markdown-content')).toEqual([['# 新内容']]);
    expect(wrapper.emitted('update:markdown-mode')).toEqual([['edit']]);
    expect(wrapper.emitted('update:markdown-font-size')).toEqual([[18]]);

    expect(wrapper.emitted('update:variables-panel-model')).toEqual([[true]]);
    expect(wrapper.emitted('apply-variables')).toEqual([[{ a: 1 }]]);
  });

  it('renders nothing when authoring controls are disabled', () => {
    const wrapper = mountPanels({ showAuthoringControls: false });

    expect(wrapper.findComponent(PropertyDrawer).exists()).toBe(false);
    expect(wrapper.findComponent(MarkdownBoard).exists()).toBe(false);
    expect(wrapper.findComponent(VariablesPanel).exists()).toBe(false);
  });
});
