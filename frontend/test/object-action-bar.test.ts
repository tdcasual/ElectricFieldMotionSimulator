import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ObjectActionBar from '../src/components/ObjectActionBar.vue';

describe('ObjectActionBar', () => {
  it('renders three touch actions', () => {
    const wrapper = mount(ObjectActionBar);
    expect(wrapper.get('[data-testid="action-open-properties"]').text()).toContain('属性');
    expect(wrapper.get('[data-testid="action-duplicate"]').text()).toContain('复制');
    expect(wrapper.get('[data-testid="action-delete"]').text()).toContain('删除');
  });

  it('emits action events when buttons are clicked', async () => {
    const wrapper = mount(ObjectActionBar);
    await wrapper.get('[data-testid="action-open-properties"]').trigger('click');
    await wrapper.get('[data-testid="action-duplicate"]').trigger('click');
    await wrapper.get('[data-testid="action-delete"]').trigger('click');

    expect(wrapper.emitted('open-properties')?.length).toBe(1);
    expect(wrapper.emitted('duplicate')?.length).toBe(1);
    expect(wrapper.emitted('delete')?.length).toBe(1);
  });
});
