import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

function resolveManualChunk(id: string) {
  if (id.includes('/node_modules/katex/')) return 'katex-markdown';
  if (id.includes('/node_modules/vue/') || id.includes('/node_modules/@vue/') || id.includes('/node_modules/pinia/')) {
    return 'vue-vendor';
  }
  if (id.includes('/frontend/src/embed/')) return 'embed-viewer';
  if (id.includes('/frontend/src/components/MarkdownBoard.vue') || id.includes('/frontend/src/components/VariablesPanel.vue')) {
    return 'authoring-panels';
  }
  if (
    id.includes('/js/core/') ||
    id.includes('/js/objects/') ||
    id.includes('/js/physics/') ||
    id.includes('/js/rendering/') ||
    id.includes('/js/interactions/') ||
    id.includes('/js/modes/') ||
    id.includes('/js/utils/')
  ) {
    return 'legacy-engine';
  }
  return undefined;
}

export default defineConfig({
  root,
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        viewer: fileURLToPath(new URL('./viewer.html', import.meta.url))
      },
      output: {
        manualChunks(id) {
          return resolveManualChunk(id);
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.ts']
  }
});
