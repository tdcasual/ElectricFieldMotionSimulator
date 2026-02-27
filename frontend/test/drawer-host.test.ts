import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DrawerHost from '../src/components/DrawerHost.vue';

describe('DrawerHost', () => {
  it('keeps mounted and hidden when keepMounted is true', () => {
    const wrapper = mount(DrawerHost, {
      props: {
        modelValue: false,
        keepMounted: true,
        variant: 'property',
        layoutMode: 'desktop'
      },
      slots: {
        default: '<div id="content">content</div>'
      }
    });

    const host = wrapper.get('[data-testid="drawer-host"]');
    expect(host.exists()).toBe(true);
    expect(host.attributes('style')).toContain('display: none');
  });

  it('emits close on backdrop pointer tap when enabled', async () => {
    const wrapper = mount(DrawerHost, {
      props: {
        modelValue: true,
        keepMounted: false,
        variant: 'variables',
        layoutMode: 'phone',
        backdrop: 'always',
        closeOnBackdrop: true
      },
      slots: {
        default: '<div id="content">content</div>'
      }
    });

    const host = wrapper.get('[data-testid="drawer-host"]');
    await host.trigger('pointerdown', { pointerId: 1 });
    await host.trigger('pointerup', { pointerId: 1 });
    expect(wrapper.emitted('close')?.length).toBe(1);
  });
});
