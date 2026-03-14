import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HeaderModeStrip from '../src/components/HeaderModeStrip.vue';

describe('HeaderModeStrip', () => {
  it('keeps full status copy in default desktop mode', () => {
    const wrapper = mount(HeaderModeStrip, {
      props: {
        running: false,
        classroomMode: false,
        demoMode: false,
        showAuthoringControls: true,
        statusText: '准备开始新的实验场景',
        objectCount: 0,
        particleCount: 0,
        compact: false
      }
    });

    expect(wrapper.get('[data-testid="header-mode-strip"]').attributes('data-compact')).toBe('false');
    expect(wrapper.find('.header-mode-copy').exists()).toBe(true);
  });

  it('hides the long status copy in compact tablet mode while keeping mode metrics', () => {
    const wrapper = mount(HeaderModeStrip, {
      props: {
        running: true,
        classroomMode: false,
        demoMode: false,
        showAuthoringControls: true,
        statusText: '演示模式：比例尺/重力已锁定',
        objectCount: 3,
        particleCount: 9,
        compact: true
      }
    });

    expect(wrapper.get('[data-testid="header-mode-strip"]').attributes('data-compact')).toBe('true');
    expect(wrapper.find('.header-mode-copy').exists()).toBe(false);
    expect(wrapper.text()).toContain('对象 3');
    expect(wrapper.text()).toContain('粒子 9');
  });
});
