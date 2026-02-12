const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 720;

const PARTICLE_RADIUS_MIN = 6;
const PARTICLE_RADIUS_MAX = 13;
const PARTICLE_RADIUS_SHORT_SIDE_RATIO = 0.0085;

const SELECTION_PADDING_MIN = 10;
const SELECTION_PADDING_MAX = 22;
const SELECTION_PADDING_FACTOR = 1.9;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDimension(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function computeResponsiveParticleMetrics(viewportWidth, viewportHeight) {
  const width = normalizeDimension(viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const height = normalizeDimension(viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const shortSide = Math.min(width, height);

  const rawRadius = shortSide * PARTICLE_RADIUS_SHORT_SIDE_RATIO;
  const particleRenderRadius = clamp(rawRadius, PARTICLE_RADIUS_MIN, PARTICLE_RADIUS_MAX);
  const particleSelectionPadding = clamp(
    particleRenderRadius * SELECTION_PADDING_FACTOR,
    SELECTION_PADDING_MIN,
    SELECTION_PADDING_MAX
  );

  return {
    particleRenderRadius: Math.round(particleRenderRadius * 10) / 10,
    particleSelectionPadding: Math.round(particleSelectionPadding * 10) / 10
  };
}
