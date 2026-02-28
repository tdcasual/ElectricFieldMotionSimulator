import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HeaderActionButtons from '../src/components/HeaderActionButtons.vue';

function mountButtons(overrides: Record<string, unknown> = {}) {
  return mount(HeaderActionButtons, {
    props: {
      isPhoneLayout: false,
      showAuthoringControls: true,
      running: false,
      classroomMode: false,
      variablesPanelOpen: false,
      markdownBoardOpen: false,
      demoMode: false,
      demoButtonTitle: '进入演示模式',
      demoButtonLabel: '演示模式',
      ...overrides
    }
  });
}

describe('HeaderActionButtons', () => {
  it('emits events for desktop controls', async () => {
    const wrapper = mountButtons();

    await wrapper.get('#play-pause-btn').trigger('click');
    await wrapper.get('#classroom-mode-btn').trigger('click');
    await wrapper.get('#reset-btn').trigger('click');
    await wrapper.get('#clear-btn').trigger('click');
    await wrapper.get('#save-btn').trigger('click');
    await wrapper.get('#load-btn').trigger('click');
    await wrapper.get('#export-btn').trigger('click');
    await wrapper.get('#import-btn').trigger('click');
    await wrapper.get('#theme-toggle-btn').trigger('click');
    await wrapper.get('#variables-btn').trigger('click');
    await wrapper.get('#markdown-toggle-btn').trigger('click');
    await wrapper.get('#demo-mode-btn').trigger('click');

    expect(wrapper.emitted('toggle-play')).toHaveLength(1);
    expect(wrapper.emitted('toggle-classroom')).toHaveLength(1);
    expect(wrapper.emitted('reset-scene')).toHaveLength(1);
    expect(wrapper.emitted('clear-scene')).toHaveLength(1);
    expect(wrapper.emitted('save-scene')).toHaveLength(1);
    expect(wrapper.emitted('load-scene')).toHaveLength(1);
    expect(wrapper.emitted('export-scene')).toHaveLength(1);
    expect(wrapper.emitted('open-import')).toHaveLength(1);
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1);
    expect(wrapper.emitted('open-variables')).toHaveLength(1);
    expect(wrapper.emitted('toggle-markdown')).toHaveLength(1);
    expect(wrapper.emitted('toggle-demo')).toHaveLength(1);
  });

  it('hides desktop authoring buttons in phone authoring layout', () => {
    const wrapper = mountButtons({ isPhoneLayout: true, showAuthoringControls: true });

    expect(wrapper.find('#play-pause-btn').exists()).toBe(false);
    expect(wrapper.find('#classroom-mode-btn').exists()).toBe(false);
    expect(wrapper.find('#clear-btn').exists()).toBe(false);
    expect(wrapper.find('#save-btn').exists()).toBe(false);
    expect(wrapper.find('#import-btn').exists()).toBe(false);
    expect(wrapper.find('#demo-mode-btn').exists()).toBe(false);
    expect(wrapper.find('#reset-btn').exists()).toBe(true);
  });

  it('shows play button in phone view mode when authoring controls are disabled', () => {
    const wrapper = mountButtons({ isPhoneLayout: true, showAuthoringControls: false });
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
  });
});
