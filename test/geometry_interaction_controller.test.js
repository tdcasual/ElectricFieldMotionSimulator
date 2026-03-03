import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applyTangencySnap,
  getObjectResizeHandle,
  getObjectResizeHandles,
  getObjectResizeMode,
  isFieldResizable,
  resolveGeometryOverlaySourceKey,
  tryStartObjectResize,
  updateGeometryOverlayHint,
  updateTangencyHintAndSnap
} from '../js/interactions/geometryInteractionController.js';
import { OBJECT_SCALE_KEY, REAL_STORE_KEY } from '../js/modes/GeometryScaling.js';

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('geometry interaction controller exports shared helpers', () => {
  assert.equal(typeof resolveGeometryOverlaySourceKey, 'function');
  assert.equal(typeof updateGeometryOverlayHint, 'function');
  assert.equal(typeof updateTangencyHintAndSnap, 'function');
  assert.equal(typeof isFieldResizable, 'function');
  assert.equal(typeof getObjectResizeMode, 'function');
  assert.equal(typeof getObjectResizeHandles, 'function');
  assert.equal(typeof getObjectResizeHandle, 'function');
  assert.equal(typeof tryStartObjectResize, 'function');
  assert.equal(typeof applyTangencySnap, 'function');
});

test('DragDropManager delegates geometry/tangency orchestration to controller module', () => {
  const source = read('js/interactions/DragDropManager.js');
  assert.match(source, /from '\.\/geometryInteractionController\.js'/);
  assert.match(source, /resolveGeometryOverlaySourceKey\(\s*this,\s*object,\s*preferredKeys\s*\)/);
  assert.match(source, /updateGeometryOverlayHint\(\s*this,\s*object,\s*preferredKeys\s*\)/);
  assert.match(source, /updateTangencyHintAndSnap\(\s*this,\s*eventLike\s*\)/);
  assert.match(source, /tryStartObjectResize\(\s*this,\s*object,\s*pointerPos\s*\)/);
  assert.match(source, /resizeObject\(\s*this,\s*field,\s*pos\s*\)/);
});

test('updateGeometryOverlayHint writes overlay payload with valid geometry dimensions', () => {
  let uiCalls = 0;
  const manager = {
    scene: {
      settings: { pixelsPerMeter: 50 },
      interaction: { geometryOverlay: null }
    },
    ensureSceneInteractionState() {
      return this.scene.interaction;
    },
    clearGeometryOverlayHint() {
      this.scene.interaction.geometryOverlay = null;
      return true;
    },
    getAppAdapter() {
      return {
        updateUI() {
          uiCalls += 1;
        }
      };
    }
  };
  const object = {
    id: 'field-1',
    radius: 50
  };
  object[REAL_STORE_KEY] = { radius: 1 };
  object[OBJECT_SCALE_KEY] = 1;

  const updated = updateGeometryOverlayHint(manager, object, ['radius']);
  assert.equal(updated, true);
  assert.equal(manager.scene.interaction.geometryOverlay?.sourceKey, 'radius');
  assert.equal(manager.scene.interaction.geometryOverlay?.realValue, 1);
  assert.equal(manager.scene.interaction.geometryOverlay?.displayValue, 50);
  assert.equal(uiCalls, 1);
});

test('updateTangencyHintAndSnap computes circle tangency hints for draggable fields', () => {
  const active = {
    id: 'active-circle',
    x: 0,
    y: 0,
    geometry: { kind: 'circle', radius: 10 }
  };
  const candidate = {
    id: 'candidate-circle',
    x: 20,
    y: 0,
    geometry: { kind: 'circle', radius: 10 }
  };
  const manager = {
    isDragging: true,
    draggingObject: active,
    scene: {
      interaction: {}
    },
    clearTangencyHint() {
      this.scene.interaction.tangencyHint = null;
    },
    getTangencyMode() {
      return 'move';
    },
    getSceneObjects() {
      return [active, candidate];
    },
    ensureSceneInteractionState() {
      return this.scene.interaction;
    },
    getInteractionKind() {
      return 'magnetic-field';
    }
  };

  updateTangencyHintAndSnap(manager);
  assert.equal(manager.scene.interaction.tangencyHint?.kind, 'circle-circle');
  assert.equal(manager.scene.interaction.tangencyHint?.activeObjectId, 'active-circle');
});
