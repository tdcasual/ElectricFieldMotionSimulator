import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/core/Renderer.js';
import { buildUniformElectricGeometry } from '../js/rendering/fieldGeometryRenderer.js';
import { buildSelectionHandles } from '../js/rendering/fieldSelectionOverlayRenderer.js';

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

test('buildUniformElectricGeometry resolves polygon bounds from geometry vertices', () => {
  const field = {
    type: 'electric-field-rect',
    x: 40,
    y: 50,
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

  const result = buildUniformElectricGeometry(field);
  assert.equal(result.kind, 'polygon');
  assert.deepEqual(result.bounds, {
    minX: 40,
    minY: 50,
    maxX: 120,
    maxY: 90
  });
});

test('buildSelectionHandles builds corner handles from polygon bounds', () => {
  const handles = buildSelectionHandles({
    vertexModeEnabled: false,
    circleBoundary: null,
    polygonVertices: [],
    polygonBounds: { minX: 10, minY: 20, maxX: 50, maxY: 80 },
    fallbackRect: { x: 0, y: 0, width: 0, height: 0 }
  });
  assert.deepEqual(handles, [
    { x: 10, y: 20 },
    { x: 50, y: 20 },
    { x: 10, y: 80 },
    { x: 50, y: 80 }
  ]);
});
