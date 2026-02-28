import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PhoneSceneSheet from '../src/components/PhoneSceneSheet.vue';

function mountSceneSheet() {
  return mount(PhoneSceneSheet, {
    props: {
      showEnergyOverlay: true,
      pixelsPerMeter: 100,
      gravity: 9.8,
      boundaryMode: 'margin',
      showBoundaryMarginControl: true,
      boundaryMargin: 200,
      timeStep: 0.016,
      timeStepLabel: '16ms',
      demoMode: false
    }
  });
}

function dispatchPointerEvent(target: Element, type: string, options: { x: number; y: number; pointerType?: string } = { x: 0, y: 0 }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: options.x });
  Object.defineProperty(event, 'clientY', { value: options.y });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType ?? 'touch' });
  target.dispatchEvent(event);
}

describe('PhoneSceneSheet', () => {
  it('forwards scene settings control events', async () => {
    const wrapper = mountSceneSheet();

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

  it('emits close from button and swipe-down gesture', async () => {
    const wrapper = mountSceneSheet();

    await wrapper.get('.phone-sheet-header .btn-icon').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    const header = wrapper.get('.phone-sheet-header').element;
    dispatchPointerEvent(header, 'pointerdown', { x: 100, y: 120, pointerType: 'touch' });
    dispatchPointerEvent(header, 'pointerup', { x: 104, y: 210, pointerType: 'touch' });
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
