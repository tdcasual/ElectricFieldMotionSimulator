<script setup lang="ts">
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';

const DEFAULT_MARKDOWN_FONT_SIZE = 16;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    content?: string;
    mode?: 'edit' | 'preview';
    fontSize?: number;
  }>(),
  {
    content: '',
    mode: 'preview',
    fontSize: DEFAULT_MARKDOWN_FONT_SIZE
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', next: boolean): void;
  (event: 'update:content', next: string): void;
  (event: 'update:mode', next: 'edit' | 'preview'): void;
  (event: 'update:fontSize', next: number): void;
}>();

const boardRef = ref<HTMLElement | null>(null);
const position = reactive({ left: 80, top: 70 });
const dragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  startLeft: 80,
  startTop: 70
});

const localContent = ref(props.content);

watch(
  () => props.content,
  (next) => {
    localContent.value = String(next ?? '');
  },
  { immediate: true }
);

const safeFontSize = computed(() => {
  const next = Number(props.fontSize);
  if (!Number.isFinite(next)) return DEFAULT_MARKDOWN_FONT_SIZE;
  return Math.max(10, Math.min(32, Math.round(next)));
});

const currentMode = computed<'edit' | 'preview'>(() => (props.mode === 'edit' ? 'edit' : 'preview'));

function close() {
  emit('update:modelValue', false);
}

function setMode(next: 'edit' | 'preview') {
  emit('update:mode', next);
}

function updateFontSize(raw: string) {
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  emit('update:fontSize', Math.max(10, Math.min(32, Math.round(next))));
}

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  const next = target?.value ?? '';
  localContent.value = next;
  emit('update:content', next);
}

function escapeHtml(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodeHtmlEntities(input: string) {
  return input
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function renderMathExpression(rawExpression: string, displayMode: boolean) {
  const expression = decodeHtmlEntities(String(rawExpression ?? '').trim());
  if (!expression) return '';
  try {
    return katex.renderToString(expression, {
      displayMode,
      throwOnError: false,
      strict: 'ignore'
    });
  } catch {
    return `<code>${escapeHtml(expression)}</code>`;
  }
}

function restoreTokens(input: string, tokens: Array<{ token: string; html: string }>) {
  let output = input;
  for (const item of tokens) {
    output = output.replaceAll(item.token, item.html);
  }
  return output;
}

function renderInlineMath(raw: string) {
  const mathTokens: Array<{ token: string; html: string }> = [];
  let output = '';
  let cursor = 0;
  let index = 0;

  while (cursor < raw.length) {
    const current = raw[cursor];

    if (current === '\\' && raw[cursor + 1] === '$') {
      output += '$';
      cursor += 2;
      continue;
    }

    if (current !== '$' || raw[cursor + 1] === '$') {
      output += current;
      cursor += 1;
      continue;
    }

    let end = cursor + 1;
    while (end < raw.length) {
      if (raw[end] === '\\' && end + 1 < raw.length) {
        end += 2;
        continue;
      }
      if (raw[end] === '$') break;
      end += 1;
    }

    if (end >= raw.length || raw[end] !== '$') {
      output += current;
      cursor += 1;
      continue;
    }

    const expression = raw.slice(cursor + 1, end).trim();
    if (!expression) {
      output += '$$';
      cursor = end + 1;
      continue;
    }

    const token = `@@INLINE_MATH_${index}@@`;
    index += 1;
    mathTokens.push({
      token,
      html: renderMathExpression(expression, false)
    });
    output += token;
    cursor = end + 1;
  }

  return { text: output, mathTokens };
}

function parseInline(raw: string) {
  const codeTokens: Array<{ token: string; html: string }> = [];
  let codeIndex = 0;
  let text = raw.replace(/`([^`]+)`/g, (_, code: string) => {
    const token = `@@INLINE_CODE_${codeIndex}@@`;
    codeIndex += 1;
    codeTokens.push({ token, html: `<code>${code}</code>` });
    return token;
  });

  const inlineMath = renderInlineMath(text);
  text = inlineMath.text;

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  text = restoreTokens(text, inlineMath.mathTokens);
  text = restoreTokens(text, codeTokens);
  return text;
}

function parseMarkdownToHtml(raw: string) {
  const input = escapeHtml(String(raw ?? '')).replace(/\r\n/g, '\n');
  if (!input.trim()) {
    return '<p>在这里输入题目、提示或说明。</p>';
  }

  const lines = input.split('\n');
  const html: string[] = [];
  let inCodeBlock = false;
  let inMathBlock = false;
  const mathBlockLines: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  const flushMathBlock = () => {
    const rendered = renderMathExpression(mathBlockLines.join('\n'), true);
    if (rendered) {
      html.push(`<div class="math-block">${rendered}</div>`);
    }
    mathBlockLines.length = 0;
  };

  for (const line of lines) {
    if (inMathBlock) {
      if (line.trim() === '$$') {
        closeLists();
        flushMathBlock();
        inMathBlock = false;
      } else {
        mathBlockLines.push(line);
      }
      continue;
    }

    if (line.startsWith('```')) {
      closeLists();
      if (!inCodeBlock) {
        html.push('<pre><code>');
      } else {
        html.push('</code></pre>');
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      html.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === '$$') {
      closeLists();
      inMathBlock = true;
      mathBlockLines.length = 0;
      continue;
    }

    const singleLineMathBlock = /^\$\$(.*)\$\$$/.exec(trimmed);
    if (singleLineMathBlock) {
      closeLists();
      const rendered = renderMathExpression(singleLineMathBlock[1], true);
      if (rendered) {
        html.push(`<div class="math-block">${rendered}</div>`);
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      closeLists();
      const level = heading[1].length;
      html.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
      continue;
    }

    const blockquote = /^>\s?(.*)$/.exec(line);
    if (blockquote) {
      closeLists();
      html.push(`<blockquote>${parseInline(blockquote[1])}</blockquote>`);
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${parseInline(ul[1])}</li>`);
      continue;
    }

    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${parseInline(ol[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      continue;
    }

    closeLists();
    html.push(`<p>${parseInline(line)}</p>`);
  }

  closeLists();
  if (inMathBlock) {
    flushMathBlock();
  }
  if (inCodeBlock) {
    html.push('</code></pre>');
  }
  return html.join('\n');
}

const previewHtml = computed(() => parseMarkdownToHtml(localContent.value));

function beginDrag(event: PointerEvent) {
  if (!props.modelValue) return;
  if (event.button !== 0) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest('button, input')) return;

  dragState.active = true;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.startLeft = position.left;
  dragState.startTop = position.top;
  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
}

function onDrag(event: PointerEvent) {
  if (!dragState.active) return;
  const board = boardRef.value;
  if (!board) return;

  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;
  const maxLeft = Math.max(0, window.innerWidth - board.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - board.offsetHeight);
  position.left = Math.max(0, Math.min(maxLeft, dragState.startLeft + dx));
  position.top = Math.max(0, Math.min(maxTop, dragState.startTop + dy));
}

function endDrag(event: PointerEvent) {
  if (!dragState.active) return;
  dragState.active = false;
  (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
}

onBeforeUnmount(() => {
  dragState.active = false;
});
</script>

<template>
  <aside
    v-show="props.modelValue"
    ref="boardRef"
    data-testid="markdown-board"
    class="markdown-board"
    :class="`mode-${currentMode}`"
    :style="{
      left: `${position.left}px`,
      top: `${position.top}px`,
      '--markdown-font-size': `${safeFontSize}px`
    }"
  >
    <div class="markdown-board-header" @pointerdown="beginDrag" @pointermove="onDrag" @pointerup="endDrag" @pointercancel="endDrag">
      <div class="markdown-board-title">题板</div>
      <div class="markdown-board-actions">
        <input
          class="markdown-font-input"
          type="number"
          min="10"
          max="32"
          :value="safeFontSize"
          aria-label="题板字体大小"
          @change="updateFontSize(($event.target as HTMLInputElement).value)"
        />
        <button
          class="btn markdown-tab"
          :class="{ active: currentMode === 'edit' }"
          aria-label="编辑模式"
          @click="setMode('edit')"
        >
          编辑
        </button>
        <button
          class="btn markdown-tab"
          :class="{ active: currentMode === 'preview' }"
          aria-label="预览模式"
          @click="setMode('preview')"
        >
          预览
        </button>
        <button class="btn-icon" aria-label="关闭题板" @click="close">✖</button>
      </div>
    </div>
    <div class="markdown-board-body">
      <textarea
        class="markdown-input"
        :value="localContent"
        aria-label="题板编辑区"
        @input="onInput"
      ></textarea>
      <div class="markdown-preview" v-html="previewHtml"></div>
    </div>
  </aside>
</template>
