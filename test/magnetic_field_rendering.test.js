import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/core/Renderer.js';

function createFakeContext() {
  return {
    arcCalls: [],
    lineToCalls: 0,
    beginPath() {},
    arc(x, y, radius) { this.arcCalls.push({ x, y, radius }); },
    rect() {},
    moveTo() {},
    lineTo() { this.lineToCalls += 1; },
    stroke() {},
    fill() {},
    clip() {},
    save() {},
    restore() {},
    setLineDash() {},
    fillRect() {},
    fillText() {},
    measureText(text) {
      return { width: String(text).length * 6 };
    }
  };
}

function renderMagneticSymbol(strength) {
  const renderer = Object.create(Renderer.prototype);
  renderer.fieldCtx = createFakeContext();
  renderer.drawTextBadge = Renderer.prototype.drawTextBadge;
  renderer.formatNumber = Renderer.prototype.formatNumber;

  const field = {
    type: 'magnetic-field',
    shape: 'rect',
    x: 0,
    y: 0,
    width: 80,
    height: 80,
    strength
  };
  const scene = { selectedObject: null };

  renderer.drawMagneticField(field, scene);
  return renderer.fieldCtx;
}

test('positive magnetic strength draws dot symbols', () => {
  const ctx = renderMagneticSymbol(0.5);
  const symbolDots = ctx.arcCalls.filter((call) => Math.abs(call.radius - 3) < 1e-6);
  assert.ok(symbolDots.length > 0);
});

test('negative magnetic strength draws cross symbols', () => {
  const zeroCtx = renderMagneticSymbol(0);
  const ctx = renderMagneticSymbol(-0.5);
  assert.ok(ctx.lineToCalls > zeroCtx.lineToCalls);
});

test('zero magnetic strength does not draw direction symbols', () => {
  const ctx = renderMagneticSymbol(0);
  const symbolDots = ctx.arcCalls.filter((call) => Math.abs(call.radius - 3) < 1e-6);
  assert.equal(symbolDots.length, 0);
});

test('rect magnetic field draws geometric center marker', () => {
  const renderer = Object.create(Renderer.prototype);
  renderer.fieldCtx = createFakeContext();
  renderer.drawTextBadge = Renderer.prototype.drawTextBadge;
  renderer.formatNumber = Renderer.prototype.formatNumber;

  renderer.drawMagneticField({
    type: 'magnetic-field',
    shape: 'rect',
    x: 20,
    y: 30,
    width: 80,
    height: 40,
    strength: 0
  }, { selectedObject: null });

  const centerDots = renderer.fieldCtx.arcCalls.filter((call) => Math.abs(call.radius - 2.5) < 1e-6);
  assert.ok(centerDots.some((call) => call.x === 60 && call.y === 50));
});

test('circle magnetic field draws geometric center marker', () => {
  const renderer = Object.create(Renderer.prototype);
  renderer.fieldCtx = createFakeContext();
  renderer.drawTextBadge = Renderer.prototype.drawTextBadge;
  renderer.formatNumber = Renderer.prototype.formatNumber;

  renderer.drawMagneticField({
    type: 'magnetic-field',
    shape: 'circle',
    x: 120,
    y: 90,
    radius: 35,
    strength: 0
  }, { selectedObject: null });

  const centerDots = renderer.fieldCtx.arcCalls.filter((call) => Math.abs(call.radius - 2.5) < 1e-6);
  assert.ok(centerDots.some((call) => call.x === 120 && call.y === 90));
});
