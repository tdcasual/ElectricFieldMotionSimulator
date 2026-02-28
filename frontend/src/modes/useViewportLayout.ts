import { ref } from 'vue';
import type { LayoutMode } from '../stores/simulatorStore';
import { resolveLayoutMode } from './layoutMode';

type ViewportLayoutOptions = {
  setLayoutMode: (mode: LayoutMode) => void;
};

export function useViewportLayout(options: ViewportLayoutOptions) {
  const isCoarsePointer = ref(false);

  function syncLayoutModeFromViewport() {
    if (typeof window === 'undefined') return;
    options.setLayoutMode(
      resolveLayoutMode(window.innerWidth, {
        viewportHeight: window.innerHeight,
        isCoarsePointer: isCoarsePointer.value
      })
    );
  }

  function syncCoarsePointer() {
    if (typeof window === 'undefined') return;
    const coarseByMedia = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    const coarseByTouchPoints = (navigator.maxTouchPoints ?? 0) > 0;
    isCoarsePointer.value = coarseByMedia || coarseByTouchPoints;
  }

  function handleWindowResize() {
    syncCoarsePointer();
    syncLayoutModeFromViewport();
  }

  function mountViewportLayout() {
    if (typeof window === 'undefined') return;
    syncCoarsePointer();
    syncLayoutModeFromViewport();
    window.addEventListener('resize', handleWindowResize);
  }

  function unmountViewportLayout() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', handleWindowResize);
  }

  return {
    isCoarsePointer,
    syncLayoutModeFromViewport,
    syncCoarsePointer,
    mountViewportLayout,
    unmountViewportLayout
  };
}
