import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import VariablesPanel from '../src/components/VariablesPanel.vue';

describe('VariablesPanel', () => {
  it('renders phone sheet class in phone layout mode', () => {
    const wrapper = mount(VariablesPanel, {
      props: {
        modelValue: true,
        layoutMode: 'phone',
        variables: { a: 1 }
      }
    });

    expect(wrapper.get('[data-testid="variables-panel"]').classes()).toContain('phone-sheet');
    expect(wrapper.get('.variables-modal').classes()).toContain('variables-sheet');
  });

  it('emits apply event with validated values', async () => {
    const wrapper = mount(VariablesPanel, {
      props: {
        modelValue: true,
        variables: { speed: 2 }
      }
    });

    await wrapper.get('[data-testid="apply-variables"]').trigger('click');
    expect(wrapper.emitted('apply')?.[0]?.[0]).toEqual({ speed: 2 });
  });
});
