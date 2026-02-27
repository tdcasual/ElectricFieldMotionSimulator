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
              { type: 'electric-field-rect', label: '均匀电场', icon: '<svg></svg>' },
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
    expect(wrapper.findAll('.toolbar-group').length).toBe(2);
    expect(wrapper.findAll('.toolbar-group-title').length).toBe(2);
    expect(wrapper.find('[data-type="electric-field-rect"]').exists()).toBe(true);
    expect(wrapper.find('[data-type="particle"]').exists()).toBe(true);
    expect(wrapper.find('[data-type="electric-field-rect"]').attributes('role')).toBe('button');
    expect(wrapper.find('[data-type="electric-field-rect"]').attributes('aria-pressed')).toBe('false');
    expect(wrapper.findAll('.tool-item-label').length).toBe(3);
    expect(wrapper.findAll('.tool-item-icon').length).toBe(1);
  });

  it('supports collapsing and expanding toolbar groups', async () => {
    const wrapper = mount(ToolbarPanel, {
      props: {
        groups: [
          {
            key: 'electric',
            label: '电场',
            entries: [{ type: 'electric-field-rect', label: '均匀电场' }]
          }
        ]
      }
    });

    const toggle = wrapper.find('.toolbar-group-toggle');
    expect(toggle.exists()).toBe(true);
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('.toolbar-group-items').attributes('style') ?? '').not.toContain('display: none');

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('.toolbar-group-items').attributes('style') ?? '').toContain('display: none');

    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
  });
});
