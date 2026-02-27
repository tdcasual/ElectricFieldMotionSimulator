import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import PropertyDrawer from '../src/components/PropertyDrawer.vue';

describe('PropertyDrawer', () => {
  it('renders schema fields and emits draft on apply', async () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        title: '粒子',
        sections: [
          {
            title: '基础',
            fields: [
              { key: 'mass', label: '质量', type: 'number' },
              { key: 'showTrajectory', label: '显示轨迹', type: 'checkbox' }
            ]
          }
        ],
        values: {
          mass: 1,
          showTrajectory: true
        }
      }
    });
    expect(wrapper.text()).toContain('质量');
    const numberInput = wrapper.find('input[type="number"]');
    await numberInput.setValue('2');
    await wrapper.find('[data-testid="apply-props"]').trigger('click');
    const payload = wrapper.emitted('apply')?.[0]?.[0] as Record<string, unknown>;
    expect(payload.mass).toBe('2');
    expect(payload.showTrajectory).toBe(true);
  });

  it('keeps apply action outside scrollable content', () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        sections: [{ fields: [{ key: 'mass', type: 'number' }] }],
        values: { mass: 1 }
      }
    });

    const scrollContent = wrapper.get('#property-content').element;
    const applyButton = wrapper.get('[data-testid="apply-props"]').element;
    expect(scrollContent.contains(applyButton)).toBe(false);
  });

  it('prevents numeric input wheel from hijacking panel interaction', async () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        sections: [{ fields: [{ key: 'mass', type: 'number' }] }],
        values: { mass: 1 }
      }
    });

    const numberInput = wrapper.get('input[type="number"]').element as HTMLInputElement;
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 40 });
    numberInput.dispatchEvent(event);
    await wrapper.vm.$nextTick();

    expect(event.defaultPrevented).toBe(true);
  });

  it('supports section collapse by defaultCollapsed and manual expand', async () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        sections: [
          { title: '基础', fields: [{ key: 'mass', label: '质量', type: 'number' }] },
          {
            title: '高级',
            defaultCollapsed: true,
            fields: [{ key: 'advancedParam', label: '高级参数', type: 'number' }]
          }
        ],
        values: { mass: 1, advancedParam: 2 }
      }
    });

    expect(wrapper.text()).not.toContain('高级参数');
    await wrapper.get('[data-testid="section-toggle-1"]').trigger('click');
    expect(wrapper.text()).toContain('高级参数');
  });

  it('adds sheet class when layout mode is phone', () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        layoutMode: 'phone',
        sections: [{ fields: [{ key: 'mass', type: 'number' }] }],
        values: { mass: 1 }
      }
    });

    expect(wrapper.get('#property-panel').classes()).toContain('panel-sheet');
  });

  it('shows density toggle in phone layout', () => {
    const wrapper = mount(PropertyDrawer, {
      props: {
        modelValue: true,
        layoutMode: 'phone',
        sections: [],
        values: {}
      }
    });

    expect(wrapper.find('[data-testid="density-toggle"]').exists()).toBe(true);
  });
});
