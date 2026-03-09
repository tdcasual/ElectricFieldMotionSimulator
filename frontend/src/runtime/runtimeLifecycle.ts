import { DragDropManager, Renderer, Scene } from '../engine/legacyBridge';

export function mountRuntimeBindings(options: {
  renderer: Renderer;
  scene: Scene;
  appAdapter: Record<string, unknown>;
  handleDemoWheel: (event: WheelEvent) => void;
  handleShowProperties: (event: Event) => void;
  handleResize: () => void;
}): DragDropManager | null {
  options.renderer.init();
  const particleCanvas = document.getElementById('particle-canvas');
  let dragDropManager: DragDropManager | null = null;
  if (particleCanvas instanceof HTMLCanvasElement) {
    dragDropManager = new DragDropManager(options.scene, options.renderer, {
      canvas: particleCanvas,
      appAdapter: options.appAdapter
    });
    particleCanvas.addEventListener('wheel', options.handleDemoWheel, { passive: false });
  }
  document.addEventListener('show-properties', options.handleShowProperties);
  window.addEventListener('resize', options.handleResize);
  return dragDropManager;
}

export function unmountRuntimeBindings(options: {
  dragDropManager: DragDropManager | null;
  handleDemoWheel: (event: WheelEvent) => void;
  handleShowProperties: (event: Event) => void;
  handleResize: () => void;
}) {
  options.dragDropManager?.dispose?.();
  const particleCanvas = document.getElementById('particle-canvas');
  if (particleCanvas instanceof HTMLCanvasElement) {
    particleCanvas.removeEventListener('wheel', options.handleDemoWheel);
  }
  window.removeEventListener('resize', options.handleResize);
  document.removeEventListener('show-properties', options.handleShowProperties);
}
