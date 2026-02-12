export type CanvasLayerSet = {
  background: HTMLCanvasElement;
  field: HTMLCanvasElement;
  particle: HTMLCanvasElement;
};

export type RendererBridge = {
  attach: () => void;
  detach: () => void;
  layers: CanvasLayerSet;
};

export function createRendererBridge(layers: CanvasLayerSet): RendererBridge {
  return {
    layers,
    attach() {
      // Placeholder for connecting canvas layers to the runtime renderer.
    },
    detach() {
      // Placeholder for disconnecting listeners/resources.
    }
  };
}
