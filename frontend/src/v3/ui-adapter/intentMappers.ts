type ToolbarCreateInput = {
  type: string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
};

const ALLOWED_TYPES = new Set(['particle', 'electric-field', 'magnetic-field']);

export function mapToolbarCreateIntent(input: ToolbarCreateInput): ToolbarCreateInput {
  const type = String(input.type ?? '').trim();
  if (!type) {
    throw new Error('type is required');
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error(`unsupported object type: ${type}`);
  }
  if (!Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    throw new Error('coordinates must be finite');
  }
  return {
    type,
    x: input.x,
    y: input.y,
    props: { ...(input.props ?? {}) }
  };
}

export function mapTimeStepIntent(input: unknown): number {
  const value = Number(input);
  if (!Number.isFinite(value)) {
    throw new Error('timeStep input must be finite');
  }
  if (value <= 0) {
    throw new Error('timeStep input must be positive');
  }
  return value;
}

export function mapViewportIntent(input: {
  width: unknown;
  height: unknown;
}) {
  const width = Number(input.width);
  const height = Number(input.height);
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('viewport width must be positive');
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error('viewport height must be positive');
  }
  return {
    width,
    height
  };
}
