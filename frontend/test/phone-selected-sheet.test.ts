import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PhoneSelectedSheet from '../src/components/PhoneSelectedSheet.vue';

function dispatchPointerEvent(target: Element, type: string, options: { x: number; y: number; pointerType?: string } = { x: 0, y: 0 }) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: options.x });
  Object.defineProperty(event, 'clientY', { value: options.y });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType ?? 'touch' });
  target.dispatchEvent(event);
}

describe('PhoneSelectedSheet', () => {
  it('renders empty-state message and action hierarchy classes', () => {
    const wrapper = mount(PhoneSelectedSheet, {
      props: {
        selectedObjectId: 'obj-1',
        objectScale: 1.23456,
        geometryRows: []
      }
    });

    expect(wrapper.text()).toContain('当前对象暂无可快捷编辑的几何参数');
    expect(wrapper.get('#phone-selected-scale-value').text()).toBe('1.235');
    expect(wrapper.get('#phone-selected-properties-btn').classes()).toContain('btn-primary');
    expect(wrapper.get('#phone-selected-delete-btn').classes()).toContain('object-action-danger');
  });

  it('emits action and close events from buttons and swipe gesture', async () => {
    const wrapper = mount(PhoneSelectedSheet, {
      props: {
        selectedObjectId: 'obj-1',
        geometryRows: []
      }
    });

    await wrapper.get('#phone-selected-properties-btn').trigger('click');
    await wrapper.get('#phone-selected-duplicate-btn').trigger('click');
    await wrapper.get('#phone-selected-delete-btn').trigger('click');
    await wrapper.get('.phone-sheet-header .btn-icon').trigger('click');

    const header = wrapper.get('.phone-sheet-header').element;
    dispatchPointerEvent(header, 'pointerdown', { x: 140, y: 120, pointerType: 'touch' });
    dispatchPointerEvent(header, 'pointerup', { x: 144, y: 220, pointerType: 'touch' });

    expect(wrapper.emitted('open-properties')).toHaveLength(1);
    expect(wrapper.emitted('duplicate')).toHaveLength(1);
    expect(wrapper.emitted('delete')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('emits real and display geometry updates from quick inputs', async () => {
    const wrapper = mount(PhoneSelectedSheet, {
      props: {
        selectedObjectId: 'obj-1',
        geometryRows: [
          {
            sourceKey: 'radius',
            label: '半径',
            realKey: 'radius',
            displayKey: 'radius__display',
            realValue: 1,
            displayValue: 50
          }
        ]
      }
    });

    const realInput = wrapper.get('#phone-selected-radius-real');
    await realInput.setValue('2');

    const displayInput = wrapper.get('#phone-selected-radius-display');
    await displayInput.setValue('120');

    expect(wrapper.emitted('update-value')).toEqual([
      [{ key: 'radius', value: '2' }],
      [{ key: 'radius__display', value: '120' }]
    ]);
  });

  it('renders geometry cards in input order for recent-first rows', () => {
    const wrapper = mount(PhoneSelectedSheet, {
      props: {
        selectedObjectId: 'obj-1',
        geometryRows: [
          {
            sourceKey: 'width',
            label: '宽度',
            realKey: 'width',
            displayKey: 'width__display',
            realValue: 2,
            displayValue: 100
          },
          {
            sourceKey: 'radius',
            label: '半径',
            realKey: 'radius',
            displayKey: 'radius__display',
            realValue: 1,
            displayValue: 50
          }
        ]
      }
    });

    const titles = wrapper.findAll('.phone-selected-geometry-title').map((node) => node.text());
    expect(titles).toEqual(['宽度', '半径']);
  });
});
