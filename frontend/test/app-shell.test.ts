import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../src/App.vue';

describe('App shell', () => {
  it('renders app shell root', () => {
    const wrapper = mount(App);
    expect(wrapper.find('[data-testid="app-shell"]').exists()).toBe(true);
  });
});
