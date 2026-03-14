import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DesktopTeachingRail from '../src/components/DesktopTeachingRail.vue';

describe('DesktopTeachingRail', () => {
  it('guides the next classroom step before particles are added', () => {
    const wrapper = mount(DesktopTeachingRail, {
      props: {
        objectCount: 1,
        particleCount: 0,
        running: false,
        classroomMode: false,
        demoMode: false
      }
    });

    expect(wrapper.get('[data-testid="desktop-teaching-rail"]').text()).toContain('下一步');
    expect(wrapper.get('[data-testid="desktop-teaching-rail"]').text()).toContain('加入粒子');
    expect(wrapper.get('[data-step="1"]').attributes('data-state')).toBe('done');
    expect(wrapper.get('[data-step="2"]').attributes('data-state')).toBe('active');
  });

  it('switches to observation guidance while running', () => {
    const wrapper = mount(DesktopTeachingRail, {
      props: {
        objectCount: 3,
        particleCount: 1,
        running: true,
        classroomMode: true,
        demoMode: false
      }
    });

    expect(wrapper.get('[data-testid="desktop-teaching-rail"]').text()).toContain('播放中');
    expect(wrapper.get('[data-testid="desktop-teaching-rail"]').text()).toContain('暂停提问');
    expect(wrapper.get('[data-step="3"]').attributes('data-state')).toBe('active');
  });
});
