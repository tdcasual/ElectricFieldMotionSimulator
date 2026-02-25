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
});
