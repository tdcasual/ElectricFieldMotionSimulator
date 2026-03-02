import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/core/Renderer.js';

function createFakeContext() {
  return {
    arcCalls: [],
    rectCalls: 0,
    lineToCalls: 0,
    beginPath() {},
    closePath() {},
    arc(x, y, radius) { this.arcCalls.push({ x, y, radius }); },
    rect() { this.rectCalls += 1; },
    strokeRect() {},
    fillRect() {},
    moveTo() {},
    lineTo() { this.lineToCalls += 1; },
    stroke() {},
    fill() {},
    clip() {},
    save() {},
    restore() {},
    setLineDash() {},
    fillText() {},
    measureText(text) {
      return { width: String(text).length * 6 };
    }
  };
}

test('polygon electric field renders polygon path and vertex handles in vertex mode', () => {
  const renderer = Object.create(Renderer.prototype);
  renderer.fieldCtx = createFakeContext();
  renderer.drawTextBadge = Renderer.prototype.drawTextBadge;
  renderer.formatNumber = Renderer.prototype.formatNumber;

  const field = {
    type: 'electric-field-rect',
    x: 40,
    y: 50,
    width: 80,
    height: 40,
    strength: 1000,
    direction: 90,
    geometry: {
      kind: 'polygon',
      vertices: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 40 },
        { x: 0, y: 40 }
      ]
    }
  };

  renderer.drawElectricField(field, {
    selectedObject: field,
    settings: { vertexEditMode: true }
  });

  assert.ok(renderer.fieldCtx.lineToCalls > 0);
  assert.ok(renderer.fieldCtx.rectCalls >= 4);
});

test('circle electric field uses circle geometry for shape and selected highlight', () => {
  const renderer = Object.create(Renderer.prototype);
  renderer.fieldCtx = createFakeContext();
  renderer.drawTextBadge = Renderer.prototype.drawTextBadge;
  renderer.formatNumber = Renderer.prototype.formatNumber;

  const field = {
    type: 'electric-field-circle',
    x: 120,
    y: 90,
    radius: 35,
    strength: 1000,
    direction: 90,
    geometry: {
      kind: 'circle',
      radius: 35
    }
  };

  renderer.drawElectricField(field, {
    selectedObject: field,
    settings: { vertexEditMode: false }
  });

  const radii = renderer.fieldCtx.arcCalls.map((call) => call.radius);
  assert.ok(radii.includes(35));
  assert.ok(radii.includes(40));
});
