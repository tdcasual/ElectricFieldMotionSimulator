import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import PropertyDrawer from '../src/components/PropertyDrawer.vue';

describe('PropertyDrawer', () => {
  it('shows apply button and emits apply event', async () => {
    const wrapper = mount(PropertyDrawer, { props: { modelValue: true } });
    await wrapper.find('[data-testid="apply-props"]').trigger('click');
    expect(wrapper.emitted('apply')).toBeTruthy();
  });
});
