import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../src/App.vue';
import { useSimulatorStore } from '../src/stores/simulatorStore';

describe('App shell', () => {
  it('renders vue-native simulator layout root', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    expect(wrapper.find('#app[data-testid="app-shell"]').exists()).toBe(true);
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
    expect(wrapper.find('#toolbar').exists()).toBe(true);
    expect(wrapper.find('#particle-canvas').exists()).toBe(true);
    expect(wrapper.find('#property-panel').exists()).toBe(true);
  });

  it('toggles demo mode button state on click', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    const demoBtn = wrapper.get('#demo-mode-btn');
    expect(demoBtn.attributes('aria-pressed')).toBe('false');
    expect(demoBtn.text()).toContain('演示模式');

    await demoBtn.trigger('click');
    await nextTick();

    expect(demoBtn.attributes('aria-pressed')).toBe('true');
    expect(demoBtn.text()).toContain('退出演示');
  });

  it('toggles play state label on click', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    const playBtn = wrapper.get('#play-pause-btn');
    expect(wrapper.get('#play-label').text()).toBe('播放');

    await playBtn.trigger('click');
    await nextTick();
    expect(wrapper.get('#play-label').text()).toBe('暂停');

    await playBtn.trigger('click');
    await nextTick();
    expect(wrapper.get('#play-label').text()).toBe('播放');
  });

  it('creates object from toolbar double click and updates footer count', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    expect(wrapper.get('#object-count').text()).toContain('对象: 0');

    await wrapper.get('#toolbar .tool-item[data-type="particle"]').trigger('dblclick');
    await nextTick();

    expect(wrapper.get('#object-count').text()).toContain('对象: 1');
  });

  it('opens markdown board from header button', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    const markdownBtn = wrapper.get('#markdown-toggle-btn');
    expect(markdownBtn.attributes('disabled')).toBeUndefined();
    expect(markdownBtn.attributes('aria-pressed')).toBe('false');

    await markdownBtn.trigger('click');
    await nextTick();

    expect(markdownBtn.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="markdown-board"]').isVisible()).toBe(true);
  });

  it('opens variables panel from header button', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    const variablesBtn = wrapper.get('#variables-btn');
    expect(variablesBtn.attributes('disabled')).toBeUndefined();
    expect(variablesBtn.attributes('aria-pressed')).toBe('false');

    await variablesBtn.trigger('click');
    await nextTick();

    expect(variablesBtn.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="variables-panel"]').isVisible()).toBe(true);
  });

  it('hides authoring controls in view mode', () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    store.setHostMode('view');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    expect(wrapper.find('#toolbar').exists()).toBe(false);
    expect(wrapper.find('#save-btn').exists()).toBe(false);
    expect(wrapper.find('#import-btn').exists()).toBe(false);
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
  });

  it('applies phone layout class from store mode', () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    (store as unknown as { setLayoutMode?: (mode: string) => void }).setLayoutMode?.('phone');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    expect(wrapper.get('#app').classes()).toContain('layout-phone');
  });

  it('syncs layout mode from viewport width on mount and resize', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);

    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(store.layoutMode).toBe('phone');
    expect(wrapper.get('#app').classes()).toContain('layout-phone');

    window.innerWidth = 900;
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(store.layoutMode).toBe('tablet');
    expect(wrapper.get('#app').classes()).toContain('layout-tablet');

    window.innerWidth = 1366;
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(store.layoutMode).toBe('desktop');
    expect(wrapper.get('#app').classes()).toContain('layout-desktop');
  });

  it('shows object action bar in phone mode when an object is selected', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('[data-testid="object-action-bar"]').exists()).toBe(true);
  });

  it('toggles phone tool rail expanded class from header button', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    expect(appShell.classes()).not.toContain('phone-toolbar-open');

    const toggle = wrapper.get('#tool-rail-toggle-btn');
    await toggle.trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-toolbar-open');

    await wrapper.get('.tool-rail-backdrop').trigger('click');
    await nextTick();
    expect(appShell.classes()).not.toContain('phone-toolbar-open');

    await toggle.trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-toolbar-open');
  });

  it('forwards action-bar duplicate and delete events to store actions', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    const duplicateSpy = vi.spyOn(store, 'duplicateSelected');
    const deleteSpy = vi.spyOn(store, 'deleteSelected');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    await wrapper.get('[data-testid="action-duplicate"]').trigger('click');
    await wrapper.get('[data-testid="action-delete"]').trigger('click');

    expect(duplicateSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });
});
