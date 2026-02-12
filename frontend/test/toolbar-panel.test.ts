import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { createPinia } from 'pinia';
import ToolbarPanel from '../src/components/ToolbarPanel.vue';

describe('ToolbarPanel', () => {
  it('renders particle creation button', () => {
    const wrapper = mount(ToolbarPanel, {
      global: {
        plugins: [createPinia()]
      }
    });
    expect(wrapper.find('[data-tool="particle"]').exists()).toBe(true);
  });
});
