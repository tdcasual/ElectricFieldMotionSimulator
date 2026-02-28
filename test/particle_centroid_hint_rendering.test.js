import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/core/Renderer.js';

function createFakeContext() {
  return {
    arcCalls: [],
    lineToCalls: 0,
    beginPath() {},
    arc(x, y, radius) { this.arcCalls.push({ x, y, radius }); },
    moveTo() {},
    lineTo() { this.lineToCalls += 1; },
    stroke() {},
    fill() {},
    save() {},
    restore() {}
  };
}

test('particle rendering draws centroid hint by default', () => {
  const renderer = Object.create(Renderer.prototype);
  renderer.particleCtx = createFakeContext();
  renderer.particleRenderRadius = 10;
  renderer.drawParticleCentroidHint = Renderer.prototype.drawParticleCentroidHint;

  renderer.drawParticle({
    position: { x: 120, y: 80 },
    charge: -1
  });

  const centerArcCalls = renderer.particleCtx.arcCalls.filter((call) => call.x === 120 && call.y === 80);
  assert.ok(centerArcCalls.length >= 3); // 主体圆 + 外/内中心点

  const smallCenterDots = centerArcCalls.filter((call) => call.radius < 4);
  assert.ok(smallCenterDots.length >= 2);
  assert.ok(renderer.particleCtx.lineToCalls >= 4); // 十字线至少两组
});
