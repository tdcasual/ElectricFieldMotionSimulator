import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AppStatusFooter from '../src/components/AppStatusFooter.vue';

describe('AppStatusFooter', () => {
  it('renders status and counters', () => {
    const wrapper = mount(AppStatusFooter, {
      props: {
        statusText: '运行中',
        objectCount: 2,
        particleCount: 5
      }
    });

    expect(wrapper.get('#status-text').text()).toBe('运行中');
    expect(wrapper.get('#object-count').text()).toContain('对象: 2');
    expect(wrapper.get('#particle-count').text()).toContain('粒子: 5');
  });
});
