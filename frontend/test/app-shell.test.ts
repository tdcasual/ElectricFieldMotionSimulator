import { describe, it, expect } from 'vitest';
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
});
