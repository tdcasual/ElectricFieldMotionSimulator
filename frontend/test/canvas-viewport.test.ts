import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import CanvasViewport from '../src/components/CanvasViewport.vue';

describe('CanvasViewport', () => {
  it('renders three layered canvases', () => {
    const wrapper = mount(CanvasViewport);
    expect(wrapper.findAll('canvas').length).toBe(3);
  });
});
