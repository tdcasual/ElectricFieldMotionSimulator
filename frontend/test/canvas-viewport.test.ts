import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import CanvasViewport from '../src/components/CanvasViewport.vue';

describe('CanvasViewport', () => {
  it('renders three layered canvases', () => {
    const wrapper = mount(CanvasViewport);
    expect(wrapper.findAll('canvas').length).toBe(3);
  });

  it('shows onboarding empty state when no objects exist in authoring mode', () => {
    const wrapper = mount(CanvasViewport, {
      props: {
        objectCount: 0,
        running: false,
        isPhoneLayout: false,
        showAuthoringControls: true,
        demoMode: false
      }
    });

    expect(wrapper.get('[data-testid="canvas-empty-state"]').text()).toContain('从左侧组件库');
    expect(wrapper.get('[data-testid="canvas-empty-state"]').text()).toContain('一轮标准演示');
    expect(wrapper.get('[data-testid="canvas-empty-state"]').text()).toContain('先放场');
  });

  it('switches empty-state copy while running with no objects', () => {
    const wrapper = mount(CanvasViewport, {
      props: {
        objectCount: 0,
        running: true,
        isPhoneLayout: false,
        showAuthoringControls: true,
        demoMode: true
      }
    });

    expect(wrapper.get('[data-testid="canvas-empty-state"]').text()).toContain('先添加对象');
  });

  it('hides onboarding empty state once the scene contains objects', () => {
    const wrapper = mount(CanvasViewport, {
      props: {
        objectCount: 1,
        particleCount: 0,
        running: false,
        isPhoneLayout: false,
        showAuthoringControls: true,
        demoMode: false
      }
    });

    expect(wrapper.find('[data-testid="canvas-empty-state"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="desktop-teaching-rail"]').exists()).toBe(true);
  });
});
