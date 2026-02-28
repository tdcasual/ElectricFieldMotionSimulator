import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SceneSettingsControls from '../src/components/SceneSettingsControls.vue';

function mountControls(overrides: Record<string, unknown> = {}) {
  return mount(SceneSettingsControls, {
    props: {
      showEnergyOverlay: true,
      pixelsPerMeter: 120,
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

describe('SceneSettingsControls', () => {
  it('emits setting events from controls', async () => {
    const wrapper = mountControls();

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

  it('hides boundary margin control when disabled', () => {
    const wrapper = mountControls({ showBoundaryMarginControl: false });
    expect(wrapper.get('#boundary-margin-control').attributes('style')).toContain('display: none');
  });

  it('disables numeric controls in demo mode', () => {
    const wrapper = mountControls({ demoMode: true });
    expect(wrapper.get('#scale-px-per-meter').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#gravity-input').attributes('disabled')).toBeDefined();
  });
});
