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
  it('renders compact desktop groups with utility tray toggles', () => {
    const wrapper = mountButtons();

    expect(wrapper.find('[data-testid="header-primary-actions"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="header-utility-actions"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="header-teaching-actions"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="header-primary-label"]').text()).toContain('主控');
    expect(wrapper.get('[data-testid="header-utility-label"]').text()).toContain('扩展');
    expect(wrapper.get('[data-testid="header-teaching-label"]').text()).toContain('教学');
    expect(wrapper.find('#save-btn').exists()).toBe(false);
    expect(wrapper.find('#scene-tray-toggle-btn').exists()).toBe(true);
    expect(wrapper.find('#settings-tray-toggle-btn').exists()).toBe(true);
  });

  it('emits events for compact desktop controls and tray toggles', async () => {
    const wrapper = mountButtons();

    await wrapper.get('#play-pause-btn').trigger('click');
    await wrapper.get('#classroom-mode-btn').trigger('click');
    await wrapper.get('#reset-btn').trigger('click');
    await wrapper.get('#scene-tray-toggle-btn').trigger('click');
    await wrapper.get('#settings-tray-toggle-btn').trigger('click');
    await wrapper.get('#theme-toggle-btn').trigger('click');
    await wrapper.get('#variables-btn').trigger('click');
    await wrapper.get('#markdown-toggle-btn').trigger('click');
    await wrapper.get('#demo-mode-btn').trigger('click');

    expect(wrapper.emitted('toggle-play')).toHaveLength(1);
    expect(wrapper.emitted('toggle-classroom')).toHaveLength(1);
    expect(wrapper.emitted('reset-scene')).toHaveLength(1);
    expect(wrapper.emitted('toggle-scene-tray')).toHaveLength(1);
    expect(wrapper.emitted('toggle-settings-tray')).toHaveLength(1);
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1);
    expect(wrapper.emitted('open-variables')).toHaveLength(1);
    expect(wrapper.emitted('toggle-markdown')).toHaveLength(1);
    expect(wrapper.emitted('toggle-demo')).toHaveLength(1);
  });

  it('hides desktop authoring buttons in phone authoring layout', () => {
    const wrapper = mountButtons({ isPhoneLayout: true, showAuthoringControls: true });

    expect(wrapper.find('#play-pause-btn').exists()).toBe(false);
    expect(wrapper.find('#classroom-mode-btn').exists()).toBe(false);
    expect(wrapper.find('#scene-tray-toggle-btn').exists()).toBe(false);
    expect(wrapper.find('#settings-tray-toggle-btn').exists()).toBe(false);
    expect(wrapper.find('#demo-mode-btn').exists()).toBe(false);
    expect(wrapper.find('#reset-btn').exists()).toBe(true);
  });

  it('shows play button in phone view mode when authoring controls are disabled', () => {
    const wrapper = mountButtons({ isPhoneLayout: true, showAuthoringControls: false });
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
  });
});
