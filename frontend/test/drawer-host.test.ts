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

    const host = wrapper.find('[data-testid="drawer-host"]');
    expect(host.isVisible()).toBe(false);
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

  it('emits close on Escape when backdrop close is enabled', async () => {
    const wrapper = mount(DrawerHost, {
      props: {
        modelValue: true,
        keepMounted: false,
        variant: 'variables',
        layoutMode: 'desktop',
        backdrop: 'always',
        closeOnBackdrop: true
      },
      slots: {
        default: '<div id="content">content</div>'
      }
    });

    const host = wrapper.get('[data-testid="drawer-host"]');
    await host.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')?.length).toBe(1);
  });

  it('traps Tab focus inside backdrop host', async () => {
    const outside = document.createElement('button');
    outside.id = 'outside-focus-anchor';
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    const wrapper = mount(DrawerHost, {
      attachTo: document.body,
      props: {
        modelValue: true,
        keepMounted: false,
        variant: 'variables',
        layoutMode: 'desktop',
        backdrop: 'always',
        closeOnBackdrop: true
      },
      slots: {
        default: `
          <div>
            <button id="focus-first">first</button>
            <button id="focus-last">last</button>
          </div>
        `
      }
    });

    const host = wrapper.get('[data-testid="drawer-host"]');
    const first = wrapper.get('#focus-first').element as HTMLButtonElement;
    const last = wrapper.get('#focus-last').element as HTMLButtonElement;

    first.focus();
    await host.trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    last.focus();
    await host.trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    wrapper.unmount();
    outside.remove();
  });
});
