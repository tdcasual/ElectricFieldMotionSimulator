import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { DragDropManager } from '../js/interactions/DragDropManager.js';
import { getObjectRealDimension } from '../js/modes/GeometryScaling.js';

function installDom(markup) {
  const dom = new JSDOM(
    `<!doctype html><html><body>${markup}</body></html>`,
    { pretendToBeVisual: true, url: 'http://localhost/' }
  );

  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const hadDocument = Object.prototype.hasOwnProperty.call(globalThis, 'document');
  const hadCustomEvent = Object.prototype.hasOwnProperty.call(globalThis, 'CustomEvent');
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevCustomEvent = globalThis.CustomEvent;

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: dom.window
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    writable: true,
    value: dom.window.document
  });
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    writable: true,
    value: dom.window.CustomEvent
  });

  return () => {
    dom.window.close();
    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: prevWindow
      });
    } else {
      // @ts-ignore
      delete globalThis.window;
    }
    if (hadDocument) {
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        writable: true,
        value: prevDocument
      });
    } else {
      // @ts-ignore
      delete globalThis.document;
    }
    if (hadCustomEvent) {
      Object.defineProperty(globalThis, 'CustomEvent', {
        configurable: true,
        writable: true,
        value: prevCustomEvent
      });
    } else {
      // @ts-ignore
      delete globalThis.CustomEvent;
    }
  };
}

function stubCanvasRect(canvas) {
  canvas.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON() {}
  });
}

test('onContextMenu ignores missing context menu container', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = { id: 'obj-1', containsPoint: () => true };
    const scene = {
      settings: { mode: 'normal' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    assert.doesNotThrow(() => {
      manager.onContextMenu({
        preventDefault() {},
        sourceCapabilities: { firesTouchEvents: false },
        button: 2,
        which: 3,
        ctrlKey: false,
        clientX: 10,
        clientY: 10
      });
    });
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('dispose detaches tool-item listeners to prevent duplicate handler execution', () => {
  const cleanup = installDom(`
    <div class="tool-item" data-type="particle" role="button" aria-pressed="false"><span>粒子</span></div>
    <canvas id="particle-canvas"></canvas>
  `);

  try {
    const canvas = document.getElementById('particle-canvas');
    const tool = document.querySelector('.tool-item');
    assert.ok(canvas);
    assert.ok(tool);
    stubCanvasRect(canvas);

    let statusCalls = 0;
    const scene = {
      settings: { mode: 'normal', pixelsPerMeter: 1 },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      addObject() {},
      findObjectAt() {
        return null;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [];
      }
    };
    const renderer = {
      invalidateFields() {},
      render() {}
    };
    const appAdapter = {
      scene,
      requestRender() {},
      updateUI() {},
      setStatusText() {
        statusCalls += 1;
      }
    };

    const manager1 = new DragDropManager(scene, renderer, { canvas, appAdapter });
    manager1.isCoarsePointer = true;
    assert.equal(tool.getAttribute('aria-pressed'), 'false');
    tool.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(statusCalls, 1);
    assert.equal(tool.getAttribute('aria-pressed'), 'true');

    manager1.dispose();
    assert.equal(tool.getAttribute('aria-pressed'), 'false');

    const manager2 = new DragDropManager(scene, renderer, { canvas, appAdapter });
    manager2.isCoarsePointer = true;
    tool.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(statusCalls, 2);
    manager2.dispose();
  } finally {
    cleanup();
  }
});

test('selection change requests UI sync so store state updates immediately', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-1',
      type: 'electric-field-rect',
      x: 20,
      y: 20,
      width: 100,
      height: 80,
      containsPoint: () => true
    };

    const renderCalls = [];
    const scene = {
      settings: { mode: 'normal' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender(options) {
          renderCalls.push(options);
        },
        updateUI() {}
      }
    });

    manager.onMouseDown({
      button: 0,
      clientX: 50,
      clientY: 50
    });

    assert.equal(renderCalls.length, 1);
    assert.equal(renderCalls[0]?.updateUI, true);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('read-only interaction lock prevents object dragging', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-1',
      type: 'electric-field-rect',
      x: 30,
      y: 40,
      width: 100,
      height: 80,
      containsPoint: () => true
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: true, hostMode: 'view' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.onMouseDown({
      button: 0,
      clientX: 40,
      clientY: 50
    });
    manager.onMouseMove({
      clientX: 220,
      clientY: 180
    });
    manager.onMouseUp({});

    assert.equal(clickedObject.x, 30);
    assert.equal(clickedObject.y, 40);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('touch micro-jitter should not cancel long-press property open', async () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-particle-1',
      type: 'particle',
      position: { x: 100, y: 100 },
      containsPoint: () => true,
      clearTrajectory() {}
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    let propertyRequestCount = 0;
    const onShowProperties = () => {
      propertyRequestCount += 1;
    };
    document.addEventListener('show-properties', onShowProperties);

    manager.onPointerDown({
      pointerId: 11,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 11,
      pointerType: 'touch',
      clientX: 104,
      clientY: 101
    });

    await new Promise((resolve) => setTimeout(resolve, 620));

    manager.onPointerUp({
      pointerId: 11,
      pointerType: 'touch',
      clientX: 104,
      clientY: 101
    });

    assert.equal(propertyRequestCount, 1);
    document.removeEventListener('show-properties', onShowProperties);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('touch drag beyond jitter threshold should still cancel long-press', async () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-particle-2',
      type: 'particle',
      position: { x: 100, y: 100 },
      containsPoint: () => true,
      clearTrajectory() {}
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    let propertyRequestCount = 0;
    const onShowProperties = () => {
      propertyRequestCount += 1;
    };
    document.addEventListener('show-properties', onShowProperties);

    manager.onPointerDown({
      pointerId: 12,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 12,
      pointerType: 'touch',
      clientX: 112,
      clientY: 100
    });

    await new Promise((resolve) => setTimeout(resolve, 620));

    manager.onPointerUp({
      pointerId: 12,
      pointerType: 'touch',
      clientX: 112,
      clientY: 100
    });

    assert.equal(propertyRequestCount, 0);
    document.removeEventListener('show-properties', onShowProperties);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('beginPinchGesture clears double-tap chain state', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const scene = {
      settings: { mode: 'demo', interactionLocked: false, hostMode: 'edit', pixelsPerMeter: 50 },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return null;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.lastTap = { time: 1234, objectId: 'obj-1' };
    manager.touchPoints.set(1, { x: 100, y: 100 });
    manager.touchPoints.set(2, { x: 140, y: 100 });

    const started = manager.beginPinchGesture();

    assert.equal(started, true);
    assert.deepEqual(manager.lastTap, { time: 0, objectId: null });
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('edit mode pinch updates zoom and clears tap-chain state', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit', pixelsPerMeter: 50, gravity: 9.8 },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      objects: [],
      findObjectAt() {
        return null;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [];
      }
    };

    let requestRenderCount = 0;
    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {
          requestRenderCount += 1;
        },
        updateUI() {}
      }
    });

    manager.lastTap = { time: 1500, objectId: 'obj-edit-pinch' };

    manager.onPointerDown({
      pointerId: 11,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerDown({
      pointerId: 12,
      pointerType: 'touch',
      clientX: 160,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 11,
      pointerType: 'touch',
      clientX: 80,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 12,
      pointerType: 'touch',
      clientX: 180,
      clientY: 100
    });

    assert.ok(scene.settings.pixelsPerMeter > 50);
    assert.equal(scene.settings.gravity, 9.8);
    assert.deepEqual(manager.lastTap, { time: 0, objectId: null });
    assert.ok(requestRenderCount >= 1);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('edit mode single-touch drag keeps object manipulation priority over pinch logic', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const particle = {
      id: 'obj-edit-drag',
      type: 'particle',
      position: { x: 100, y: 100 },
      clearTrajectory() {}
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit', pixelsPerMeter: 50, gravity: 9.8 },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return particle;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [particle];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.onPointerDown({
      pointerId: 21,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 21,
      pointerType: 'touch',
      clientX: 132,
      clientY: 132
    });

    assert.equal(particle.position.x, 132);
    assert.equal(particle.position.y, 132);
    assert.equal(scene.settings.pixelsPerMeter, 50);

    manager.onPointerUp({
      pointerId: 21,
      pointerType: 'touch',
      clientX: 132,
      clientY: 132
    });
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('pointercancel clears double-tap chain to avoid stale second-tap detection', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-cancel-1',
      type: 'particle',
      position: { x: 100, y: 100 },
      containsPoint: () => true,
      clearTrajectory() {}
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.lastTap = { time: 2000, objectId: 'obj-cancel-1' };
    manager.onPointerDown({
      pointerId: 31,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerCancel({
      pointerId: 31,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });

    assert.deepEqual(manager.lastTap, { time: 0, objectId: null });
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('reset tap-chain event clears stale single-tap history before next tap', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const clickedObject = {
      id: 'obj-reset-event-1',
      type: 'particle',
      position: { x: 100, y: 100 },
      containsPoint: () => true,
      clearTrajectory() {}
    };

    const scene = {
      settings: { mode: 'normal', interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return clickedObject;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [clickedObject];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    let propertyRequestCount = 0;
    const onShowProperties = () => {
      propertyRequestCount += 1;
    };
    document.addEventListener('show-properties', onShowProperties);

    manager.onPointerDown({
      pointerId: 41,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerUp({
      pointerId: 41,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });

    assert.equal(propertyRequestCount, 0);
    assert.equal(manager.lastTap.objectId, 'obj-reset-event-1');

    document.dispatchEvent(new window.Event('simulator-reset-tap-chain'));
    assert.deepEqual(manager.lastTap, { time: 0, objectId: null });

    manager.onPointerDown({
      pointerId: 42,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    manager.onPointerUp({
      pointerId: 42,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });

    assert.equal(propertyRequestCount, 0);
    document.removeEventListener('show-properties', onShowProperties);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('resize handle drag updates display scale without mutating real geometry', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const field = {
      id: 'obj-magnetic-circle',
      type: 'magnetic-field',
      shape: 'circle',
      x: 100,
      y: 100,
      radius: 50,
      width: 100,
      height: 100
    };

    const scene = {
      settings: { mode: 'normal', pixelsPerMeter: 50, interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      findObjectAt() {
        return field;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [field];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.onMouseDown({
      button: 0,
      clientX: 150,
      clientY: 100
    });
    manager.onMouseMove({
      clientX: 200,
      clientY: 100
    });
    manager.onMouseUp({});

    assert.equal(field.radius, 100);
    assert.equal(getObjectRealDimension(field, 'radius', scene), 1);
    manager.dispose();
  } finally {
    cleanup();
  }
});

test('geometry overlay payload appears during resize drag and clears on pointer up', () => {
  const cleanup = installDom('<canvas id="particle-canvas"></canvas>');
  try {
    const canvas = document.getElementById('particle-canvas');
    assert.ok(canvas);
    stubCanvasRect(canvas);

    const field = {
      id: 'obj-overlay-circle',
      type: 'magnetic-field',
      shape: 'circle',
      x: 100,
      y: 100,
      radius: 50,
      width: 100,
      height: 100
    };

    const scene = {
      settings: { mode: 'normal', pixelsPerMeter: 50, interactionLocked: false, hostMode: 'edit' },
      selectedObject: null,
      camera: { offsetX: 0, offsetY: 0 },
      interaction: { tangencyHint: null, geometryOverlay: null },
      findObjectAt() {
        return field;
      },
      toWorldPoint(x, y) {
        return { x, y };
      },
      getAllObjects() {
        return [field];
      }
    };

    const renderer = {
      invalidateFields() {},
      render() {}
    };

    const manager = new DragDropManager(scene, renderer, {
      canvas,
      appAdapter: {
        scene,
        requestRender() {},
        updateUI() {}
      }
    });

    manager.onPointerDown({
      pointerId: 51,
      pointerType: 'touch',
      clientX: 150,
      clientY: 100
    });
    manager.onPointerMove({
      pointerId: 51,
      pointerType: 'touch',
      clientX: 200,
      clientY: 100
    });

    assert.equal(scene.interaction.geometryOverlay?.sourceKey, 'radius');
    assert.equal(scene.interaction.geometryOverlay?.objectId, 'obj-overlay-circle');
    assert.equal(scene.interaction.geometryOverlay?.displayValue, 100);
    assert.equal(scene.interaction.geometryOverlay?.realValue, 1);
    assert.equal(scene.interaction.geometryOverlay?.objectScale, 2);

    manager.onPointerUp({
      pointerId: 51,
      pointerType: 'touch',
      clientX: 200,
      clientY: 100
    });

    assert.equal(scene.interaction.geometryOverlay, null);
    manager.dispose();
  } finally {
    cleanup();
  }
});
