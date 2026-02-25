import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ToolbarPanel from '../src/components/ToolbarPanel.vue';

describe('ToolbarPanel', () => {
  it('renders registry-driven groups and tool items', () => {
    const wrapper = mount(ToolbarPanel, {
      props: {
        groups: [
          {
            key: 'electric',
            label: '电场',
            entries: [
              { type: 'electric-field-rect', label: '均匀电场' },
              { type: 'electric-field-circle', label: '圆形电场' }
            ]
          },
          {
            key: 'particle',
            label: '粒子',
            entries: [{ type: 'particle', label: '带电粒子' }]
          }
        ]
      }
    });
    expect(wrapper.findAll('.tool-section').length).toBe(2);
    expect(wrapper.find('[data-type="electric-field-rect"]').exists()).toBe(true);
    expect(wrapper.find('[data-type="particle"]').exists()).toBe(true);
  });
});
