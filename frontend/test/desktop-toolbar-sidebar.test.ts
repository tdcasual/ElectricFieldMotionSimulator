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

  it('shows desktop creation hint text', () => {
    const wrapper = mount(DesktopToolbarSidebar, {
      props: {
        groups: []
      }
    });

    expect(wrapper.get('[data-testid="desktop-toolbar-hint"]').text()).toContain('从空白画布开始搭建演示');
    expect(wrapper.get('[data-testid="desktop-toolbar-hint"]').text()).toContain('预设场景');
    expect(wrapper.get('[data-testid="desktop-teaching-sequence"]').text()).toContain('先放场');
    expect(wrapper.get('[data-testid="desktop-teaching-sequence"]').text()).toContain('再放粒子');
    expect(wrapper.find('[data-testid="desktop-preset-section"]').exists()).toBe(true);
  });

  it('switches to a concise hint in compact tablet mode', () => {
    const wrapper = mount(DesktopToolbarSidebar, {
      props: {
        groups: [],
        compact: true
      }
    });

    expect(wrapper.get('#toolbar').attributes('data-compact')).toBe('true');
    expect(wrapper.get('[data-testid="desktop-toolbar-hint"]').text()).toContain('双击组件可居中创建');
    expect(wrapper.get('[data-testid="desktop-toolbar-hint"]').text()).not.toContain('从空白画布开始搭建演示');
    expect(wrapper.find('[data-testid="desktop-teaching-sequence"]').exists()).toBe(false);
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
