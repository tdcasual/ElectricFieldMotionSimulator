import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SelectionContextMenu from '../src/components/SelectionContextMenu.vue';

describe('SelectionContextMenu', () => {
  it('emits actions for menu items', async () => {
    const wrapper = mount(SelectionContextMenu);

    await wrapper.get('#menu-properties').trigger('click');
    await wrapper.get('#menu-duplicate').trigger('click');
    await wrapper.get('#menu-delete').trigger('click');

    expect(wrapper.emitted('open-properties')).toHaveLength(1);
    expect(wrapper.emitted('duplicate')).toHaveLength(1);
    expect(wrapper.emitted('delete')).toHaveLength(1);
  });
});
