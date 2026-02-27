import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '../../styles/theme.css';
import '../../styles/main.css';
import '../../styles/components.css';
import '../../styles/animations.css';
import { useSimulatorStore } from './stores/simulatorStore';
import { parseEmbedConfigFromSearch } from './embed/embedConfig';
import { installHostCommandBridge } from './embed/hostBridge';

function resolveParentOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.parent === window) return null;
  const referrer = typeof document !== 'undefined' ? document.referrer : '';
  if (!referrer) return null;
  try {
    return new URL(referrer).origin;
  } catch {
    return null;
  }
}

const parentOrigin = resolveParentOrigin();

function emitHostEvent(type: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (window.parent === window) return;
  window.parent.postMessage(
    {
      source: 'electric-field-sim',
      type,
      payload
    },
    parentOrigin ?? '*'
  );
}

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.mount('#root');

if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  const store = useSimulatorStore(pinia);
  installHostCommandBridge(
    {
      startRunning: () => store.startRunning(),
      stopRunning: () => store.stopRunning(),
      toggleRunning: () => store.toggleRunning(),
      resetScene: () => store.resetScene(),
      loadSceneData: (data) => store.loadSceneData(data)
    },
    {
      emit: (type, payload) => emitHostEvent(type, payload),
      allowedOrigins: parentOrigin ? [parentOrigin] : undefined
    }
  );

  const config = parseEmbedConfigFromSearch(window.location.search);
  void store.bootstrapFromEmbed(config)
    .then((result) => {
      if (!result.ok) {
        emitHostEvent('error', {
          code: result.code,
          message: result.error
        });
        return;
      }
      emitHostEvent('ready', {
        mode: store.hostMode,
        viewMode: store.viewMode,
        running: store.running
      });
    })
    .catch((error) => {
      emitHostEvent('error', {
        code: 'runtime',
        message: error instanceof Error ? error.message : 'Unknown bootstrap error'
      });
    });
}
