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
