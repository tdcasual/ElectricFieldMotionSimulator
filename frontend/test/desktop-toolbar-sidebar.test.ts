import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DesktopToolbarSidebar from '../src/components/DesktopToolbarSidebar.vue';
import ToolbarPanel from '../src/components/ToolbarPanel.vue';

describe('DesktopToolbarSidebar', () => {
  it('emits load-preset events for preset buttons', async () => {
    const wrapper = mount(DesktopToolbarSidebar, {
      props: {
        groups: []
      }
    });

    await wrapper.get('[data-preset="uniform-acceleration"]').trigger('click');
    await wrapper.get('[data-preset="cyclotron"]').trigger('click');
    await wrapper.get('[data-preset="capacitor-deflection"]').trigger('click');

    expect(wrapper.emitted('load-preset')).toEqual([
      ['uniform-acceleration'],
      ['cyclotron'],
      ['capacitor-deflection']
    ]);
  });

  it('forwards create event from toolbar panel', async () => {
    const wrapper = mount(DesktopToolbarSidebar, {
      props: {
        groups: [
          {
            key: 'particle',
            label: '粒子',
            entries: [{ type: 'particle', label: '粒子' }]
          }
        ]
      }
    });

    wrapper.findComponent(ToolbarPanel).vm.$emit('create', 'particle');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('create')).toEqual([['particle']]);
  });
});
