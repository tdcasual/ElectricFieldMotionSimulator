import test from 'node:test';
import assert from 'node:assert/strict';

import { computeResponsiveParticleMetrics } from '../js/rendering/ResponsiveSizing.js';

test('responsive particle metrics grows with viewport short side', () => {
  const small = computeResponsiveParticleMetrics(800, 600);
  const medium = computeResponsiveParticleMetrics(1920, 1080);
  const large = computeResponsiveParticleMetrics(3840, 2160);

  assert.ok(small.particleRenderRadius < medium.particleRenderRadius);
  assert.ok(medium.particleRenderRadius <= large.particleRenderRadius);
});

test('responsive particle metrics clamps to configured limits', () => {
  const tiny = computeResponsiveParticleMetrics(320, 240);
  const huge = computeResponsiveParticleMetrics(8000, 6000);

  assert.equal(tiny.particleRenderRadius, 6);
  assert.equal(huge.particleRenderRadius, 13);
  assert.ok(tiny.particleSelectionPadding >= 10);
  assert.ok(huge.particleSelectionPadding <= 22);
});

test('responsive particle metrics falls back for invalid viewport input', () => {
  const fallback = computeResponsiveParticleMetrics(NaN, -1);
  assert.equal(Number.isFinite(fallback.particleRenderRadius), true);
  assert.equal(Number.isFinite(fallback.particleSelectionPadding), true);
});
