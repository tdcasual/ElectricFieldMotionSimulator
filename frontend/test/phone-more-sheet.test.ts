import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PhoneMoreSheet from '../src/components/PhoneMoreSheet.vue';

function dispatchPointerEvent(target: Element, type: string, options: { x: number; y: number; pointerType?: string } = { x: 0, y: 0 }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: options.x });
  Object.defineProperty(event, 'clientY', { value: options.y });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType ?? 'touch' });
  target.dispatchEvent(event);
}

describe('PhoneMoreSheet', () => {
  it('emits command events for all quick action buttons', async () => {
    const wrapper = mount(PhoneMoreSheet);

    await wrapper.get('#secondary-export-btn').trigger('click');
    await wrapper.get('#secondary-import-btn').trigger('click');
    await wrapper.get('#secondary-theme-btn').trigger('click');
    await wrapper.get('#secondary-save-btn').trigger('click');
    await wrapper.get('#secondary-load-btn').trigger('click');
    await wrapper.get('#secondary-clear-btn').trigger('click');
    await wrapper.get('#secondary-variables-btn').trigger('click');
    await wrapper.get('#secondary-markdown-btn').trigger('click');

    expect(wrapper.emitted('export-scene')).toHaveLength(1);
    expect(wrapper.emitted('open-import')).toHaveLength(1);
    expect(wrapper.emitted('toggle-theme')).toHaveLength(1);
    expect(wrapper.emitted('save-scene')).toHaveLength(1);
    expect(wrapper.emitted('load-scene')).toHaveLength(1);
    expect(wrapper.emitted('clear-scene')).toHaveLength(1);
    expect(wrapper.emitted('open-variables')).toHaveLength(1);
    expect(wrapper.emitted('toggle-markdown')).toHaveLength(1);
  });

  it('emits close on header close button and swipe-down gesture', async () => {
    const wrapper = mount(PhoneMoreSheet);

    await wrapper.get('.phone-sheet-header .btn-icon').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);

    const header = wrapper.get('.phone-sheet-header').element;
    dispatchPointerEvent(header, 'pointerdown', { x: 120, y: 120, pointerType: 'touch' });
    dispatchPointerEvent(header, 'pointerup', { x: 128, y: 220, pointerType: 'touch' });

    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});
