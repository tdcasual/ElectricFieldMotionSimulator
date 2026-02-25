import { describe, it, expect } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../src/App.vue';

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
});
