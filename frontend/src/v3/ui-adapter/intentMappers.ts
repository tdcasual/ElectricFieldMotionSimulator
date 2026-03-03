type ToolbarCreateInput = {
  type: string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
};

export function mapToolbarCreateIntent(input: ToolbarCreateInput): ToolbarCreateInput {
  const type = String(input.type ?? '').trim();
  if (!type) {
    throw new Error('type is required');
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
  return value;
}

