import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MarkdownBoard from '../src/components/MarkdownBoard.vue';

describe('MarkdownBoard', () => {
  it('uses a readable default font size', () => {
    const wrapper = mount(MarkdownBoard, {
      props: {
        modelValue: true
      }
    });

    const style = wrapper.get('[data-testid="markdown-board"]').attributes('style');
    expect(style).toContain('--markdown-font-size: 16px');
  });

  it('renders inline and block latex formulas in preview mode', () => {
    const wrapper = mount(MarkdownBoard, {
      props: {
        modelValue: true,
        mode: 'preview',
        content: '速度公式：$v=\\frac{s}{t}$\n\n$$E=mc^2$$'
      }
    });

    const preview = wrapper.get('.markdown-preview');
    expect(preview.find('.katex').exists()).toBe(true);
    expect(preview.find('.katex-display').exists()).toBe(true);
  });
});
