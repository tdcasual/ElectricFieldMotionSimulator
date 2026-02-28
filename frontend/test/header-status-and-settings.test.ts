import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import HeaderStatusAndSettings from '../src/components/HeaderStatusAndSettings.vue';

function mountHeader(overrides: Record<string, unknown> = {}) {
  return mount(HeaderStatusAndSettings, {
    props: {
      isPhoneLayout: false,
      showAuthoringControls: true,
      statusText: '就绪',
      objectCount: 2,
      particleCount: 3,
      showEnergyOverlay: true,
      pixelsPerMeter: 100,
      gravity: 9.8,
      boundaryMode: 'margin',
      showBoundaryMarginControl: true,
      boundaryMargin: 200,
      timeStep: 0.016,
      timeStepLabel: '16ms',
      demoMode: false,
      ...overrides
    }
  });
}

describe('HeaderStatusAndSettings', () => {
  it('shows phone status strip in phone layout', () => {
    const wrapper = mountHeader({ isPhoneLayout: true, showAuthoringControls: true, statusText: '运行中', objectCount: 5, particleCount: 8 });

    expect(wrapper.find('[data-testid="phone-status-strip"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('运行中');
    expect(wrapper.text()).toContain('对象 5 · 粒子 8');
    expect(wrapper.find('#header-settings-panel').exists()).toBe(false);
  });

  it('shows desktop settings and forwards control events', async () => {
    const wrapper = mountHeader({ isPhoneLayout: false, showAuthoringControls: true });

    expect(wrapper.find('#header-settings-panel').exists()).toBe(true);

    await wrapper.get('#toggle-energy-overlay').trigger('change');
    await wrapper.get('#scale-px-per-meter').trigger('change');
    await wrapper.get('#gravity-input').trigger('change');
    await wrapper.get('#boundary-mode-select').trigger('change');
    await wrapper.get('#boundary-margin-input').trigger('change');
    await wrapper.get('#timestep-slider').trigger('input');

    expect(wrapper.emitted('set-show-energy')).toHaveLength(1);
    expect(wrapper.emitted('set-pixels-per-meter')).toHaveLength(1);
    expect(wrapper.emitted('set-gravity')).toHaveLength(1);
    expect(wrapper.emitted('set-boundary-mode')).toHaveLength(1);
    expect(wrapper.emitted('set-boundary-margin')).toHaveLength(1);
    expect(wrapper.emitted('set-time-step')).toHaveLength(1);
  });
});
