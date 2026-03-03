import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('embed sdk bridge supports ready event and host commands', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  const ready = await page.evaluate(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return harness?.readyEvents?.[harness.readyEvents.length - 1] ?? null;
  });
  expect(ready).toBeTruthy();
  expect(String((ready as { mode?: unknown }).mode ?? '')).toBe('view');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { play: () => Promise<unknown> } }).__embedHarness;
    await harness?.play();
  });
  const frame = page.frameLocator('#embed-frame');
  await expect(frame.locator('#play-label')).toHaveText('暂停');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { pause: () => Promise<unknown> } }).__embedHarness;
    await harness?.pause();
  });
  await expect(frame.locator('#play-label')).toHaveText('播放');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    await harness?.loadScene({
      version: '2.0',
      settings: {},
      objects: [{ type: 'particle' }]
    });
  });
  await expect(frame.locator('#object-count')).toContainText('1');

  const invalid = await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    try {
      await harness?.loadScene('invalid');
      return { ok: true };
    } catch (error) {
      return error;
    }
  });
  expect(String((invalid as { code?: unknown }).code ?? '')).toBe('validation');
});

test('embed host can bootstrap viewer by material id', async ({ page }) => {
  await page.goto('/embed-host-test.html?materialId=mock-particle');
  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  const frame = page.frameLocator('#embed-frame');
  await expect(frame.locator('#object-count')).toContainText('1');
});

test('embed host smoke captures screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.goto('/embed-host-test.html?materialId=mock-particle');

  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  const frame = page.frameLocator('#embed-frame');
  await expect(frame.locator('#play-pause-btn')).toBeVisible();
  await expect(frame.locator('#reset-btn')).toBeVisible();
  await expect(frame.locator('#object-count')).toContainText('1');

  const screenshotDir = path.resolve(process.cwd(), 'output', 'playwright', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.locator('#embed-frame').screenshot({
    path: path.join(screenshotDir, 'embed-smoke-iframe.png')
  });
});

test('view mode right-click on object does not crash without context menu node', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(String(error));
  });

  await page.goto('/embed-host-test.html');
  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    await harness?.loadScene({
      version: '2.0',
      settings: { pixelsPerMeter: 50, gravity: 0 },
      objects: [
        { type: 'electric-field-rect', x: 50, y: 50, width: 800, height: 500, Ex: 100, Ey: 0 }
      ]
    });
  });

  const frame = page.frameLocator('#embed-frame');
  await expect(frame.locator('#object-count')).toContainText('1');

  const canvas = frame.locator('#particle-canvas');
  await canvas.click({
    button: 'right',
    position: { x: 250, y: 200 }
  });

  await expect(frame.locator('#play-pause-btn')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('view mode blocks pointer edits on canvas objects', async ({ page }) => {
  await page.goto('/embed-host-test.html');
  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    await harness?.loadScene({
      version: '2.0',
      settings: { pixelsPerMeter: 50, gravity: 0 },
      objects: [
        { type: 'electric-field-rect', x: 80, y: 80, width: 420, height: 260, strength: 1000, direction: 90 }
      ]
    });
  });

  const frame = page.frameLocator('#embed-frame');
  const before = await frame.locator('#canvas-container').screenshot();
  const canvas = frame.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();

  const startX = box!.x + 180;
  const startY = box!.y + 160;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 140, startY + 40, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(80);

  const after = await frame.locator('#canvas-container').screenshot();
  expect(after.equals(before)).toBe(true);
});

test('embed sdk destroy rejects in-flight command promises instead of leaving them pending', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      play: () => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      mode: 'view',
      toolbar: false
    });

    const mount = document.createElement('div');
    mount.id = 'embed-destroy-race';
    document.body.appendChild(mount);
    app.inject(mount);

    const commandResult = app.play()
      .then(() => ({ status: 'resolved' as const }))
      .catch((error: unknown) => {
        const payload = error as { code?: unknown; message?: unknown };
        return {
          status: 'rejected' as const,
          code: String(payload?.code ?? ''),
          message: String(payload?.message ?? '')
        };
      });

    app.destroy();

    const timeoutResult = new Promise<{ status: 'pending' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'pending' }), 250);
    });

    return Promise.race([commandResult, timeoutResult]);
  });

  expect((settled as { status?: unknown }).status).toBe('rejected');
  expect((settled as { code?: unknown }).code).toBe('destroyed');
});

test('embed sdk re-inject rejects in-flight command promises from previous iframe', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      play: () => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      mode: 'view',
      toolbar: false
    });

    const mountA = document.createElement('div');
    mountA.id = 'embed-reinject-race-a';
    document.body.appendChild(mountA);
    app.inject(mountA);

    const commandResult = app.play()
      .then(() => ({ status: 'resolved' as const }))
      .catch((error: unknown) => {
        const payload = error as { code?: unknown; message?: unknown };
        return {
          status: 'rejected' as const,
          code: String(payload?.code ?? ''),
          message: String(payload?.message ?? '')
        };
      });

    const mountB = document.createElement('div');
    mountB.id = 'embed-reinject-race-b';
    document.body.appendChild(mountB);
    app.inject(mountB);

    const timeoutResult = new Promise<{ status: 'pending' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'pending' }), 250);
    });

    const result = await Promise.race([commandResult, timeoutResult]);
    app.destroy();
    return result;
  });

  expect((settled as { status?: unknown }).status).toBe('rejected');
  expect((settled as { code?: unknown }).code).toBe('replaced');
});

test('embed sdk re-inject recalibrates derived target origin after stale targetOrigin', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const result = await page.evaluate(async () => {
    const AppCtor = (window as unknown as {
      ElectricFieldApp: new (options: Record<string, unknown>) => {
        options: Record<string, unknown>;
        inject: (target: HTMLElement) => HTMLIFrameElement;
        play: () => Promise<unknown>;
        destroy: () => void;
      };
    }).ElectricFieldApp;

    let readyCount = 0;
    const app = new AppCtor({
      mode: 'view',
      toolbar: false,
      onReady: () => {
        readyCount += 1;
      }
    });

    const mount = document.createElement('div');
    mount.id = 'embed-cross-origin-switch';
    document.body.appendChild(mount);
    app.inject(mount);

    const waitForReadyCount = async (target: number) => {
      const started = Date.now();
      while (Date.now() - started < 4000) {
        if (readyCount >= target) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      }
      return false;
    };

    try {
      const firstReady = await waitForReadyCount(1);
      if (!firstReady) {
        app.destroy();
        return {
          ok: false as const,
          code: 'not-ready-first'
        };
      }

      // Simulate stale origin from previous inject lifecycle.
      app.targetOrigin = 'http://invalid.local';
      app.inject(mount);

      const secondReady = await waitForReadyCount(2);
      if (!secondReady) {
        app.destroy();
        return {
          ok: false as const,
          code: 'not-ready-second'
        };
      }
      await app.play();
      app.destroy();
      return { ok: true as const };
    } catch (error) {
      const payload = error as { code?: unknown; message?: unknown };
      app.destroy();
      return {
        ok: false as const,
        code: String(payload?.code ?? ''),
        message: String(payload?.message ?? '')
      };
    }
  });

  expect((result as { ok?: unknown }).ok).toBe(true);
});

test('embed sdk re-inject honors updated explicit targetOrigin option', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const result = await page.evaluate(async () => {
    const AppCtor = (window as unknown as {
      ElectricFieldApp: new (options: Record<string, unknown>) => {
        options: Record<string, unknown>;
        inject: (target: HTMLElement) => HTMLIFrameElement;
        play: () => Promise<unknown>;
        destroy: () => void;
      };
    }).ElectricFieldApp;

    let readyCount = 0;
    const app = new AppCtor({
      mode: 'view',
      toolbar: false,
      targetOrigin: 'http://invalid.local',
      onReady: () => {
        readyCount += 1;
      }
    });

    const mount = document.createElement('div');
    mount.id = 'embed-target-origin-update';
    document.body.appendChild(mount);
    app.inject(mount);

    app.options.targetOrigin = window.location.origin;
    app.inject(mount);

    const waitForReady = async () => {
      const started = Date.now();
      while (Date.now() - started < 4000) {
        if (readyCount > 0) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      }
      return false;
    };

    try {
      const ready = await waitForReady();
      if (!ready) {
        app.destroy();
        return { ok: false as const, code: 'not-ready' };
      }
      await app.play();
      app.destroy();
      return { ok: true as const };
    } catch (error) {
      const payload = error as { code?: unknown; message?: unknown };
      app.destroy();
      return {
        ok: false as const,
        code: String(payload?.code ?? ''),
        message: String(payload?.message ?? '')
      };
    }
  });

  expect((result as { ok?: unknown }).ok).toBe(true);
});

test('embed sdk rejects wildcard targetOrigin without explicit dev override', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const result = await page.evaluate(() => {
    const AppCtor = (window as unknown as {
      ElectricFieldApp: new (options: Record<string, unknown>) => {
        inject: (target: HTMLElement) => HTMLIFrameElement;
      };
    }).ElectricFieldApp;

    const app = new AppCtor({
      mode: 'view',
      toolbar: false,
      targetOrigin: '*'
    });

    const mount = document.createElement('div');
    mount.id = 'embed-wildcard-target-origin-disallowed';
    document.body.appendChild(mount);

    try {
      app.inject(mount);
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        message: String((error as { message?: unknown })?.message ?? '')
      };
    }
  });

  expect((result as { ok?: unknown }).ok).toBe(false);
  expect(String((result as { message?: unknown }).message ?? '')).toContain('allowDevWildcardTargetOrigin');
});

test('embed sdk allows wildcard targetOrigin only with explicit dev override', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const result = await page.evaluate(async () => {
    const AppCtor = (window as unknown as {
      ElectricFieldApp: new (options: Record<string, unknown>) => {
        inject: (target: HTMLElement) => HTMLIFrameElement;
        play: () => Promise<unknown>;
        destroy: () => void;
      };
    }).ElectricFieldApp;

    let readyCount = 0;
    const app = new AppCtor({
      mode: 'view',
      toolbar: false,
      targetOrigin: '*',
      allowDevWildcardTargetOrigin: true,
      onReady: () => {
        readyCount += 1;
      }
    });

    const mount = document.createElement('div');
    mount.id = 'embed-wildcard-target-origin-allowed';
    document.body.appendChild(mount);
    app.inject(mount);

    const waitForReady = async () => {
      const started = Date.now();
      while (Date.now() - started < 4000) {
        if (readyCount > 0) return true;
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      }
      return false;
    };

    try {
      const ready = await waitForReady();
      if (!ready) {
        app.destroy();
        return { ok: false as const, code: 'not-ready' };
      }
      await app.play();
      app.destroy();
      return { ok: true as const };
    } catch (error) {
      const payload = error as { code?: unknown; message?: unknown };
      app.destroy();
      return {
        ok: false as const,
        code: String(payload?.code ?? ''),
        message: String(payload?.message ?? '')
      };
    }
  });

  expect((result as { ok?: unknown }).ok).toBe(true);
});

test('embed sdk rejects inject when viewer origin cannot be resolved and targetOrigin is missing', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const result = await page.evaluate(() => {
    const AppCtor = (window as unknown as {
      ElectricFieldApp: new (options: Record<string, unknown>) => {
        inject: (target: HTMLElement) => HTMLIFrameElement;
      };
    }).ElectricFieldApp;

    const app = new AppCtor({
      mode: 'view',
      toolbar: false,
      viewerPath: 'http://[::1'
    });

    const mount = document.createElement('div');
    mount.id = 'embed-unresolved-origin';
    document.body.appendChild(mount);

    try {
      app.inject(mount);
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        message: String((error as { message?: unknown })?.message ?? '')
      };
    }
  });

  expect((result as { ok?: unknown }).ok).toBe(false);
  expect(String((result as { message?: unknown }).message ?? '')).toContain('targetOrigin');
});

test('embed sdk queues commands issued before ready and settles without timeout', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      play: () => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      mode: 'view',
      toolbar: false
    });

    const mount = document.createElement('div');
    mount.id = 'embed-pre-ready-command';
    document.body.appendChild(mount);
    app.inject(mount);

    const commandResult = app.play()
      .then(() => ({ status: 'resolved' as const }))
      .catch((error: unknown) => {
        const payload = error as { code?: unknown; message?: unknown };
        return {
          status: 'rejected' as const,
          code: String(payload?.code ?? ''),
          message: String(payload?.message ?? '')
        };
      });

    const timeoutResult = new Promise<{ status: 'pending' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'pending' }), 3000);
    });

    const result = await Promise.race([commandResult, timeoutResult]);
    app.destroy();
    return result;
  });

  expect((settled as { status?: unknown }).status).toBe('resolved');
});

test('embed sdk pre-ready queued command survives delayed ready handshake', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const delayedViewerHtml = [
      '<!doctype html><html><body><script>',
      "window.addEventListener('message', function (event) {",
      '  var data = event.data || {};',
      "  if (data.source !== 'electric-field-host' || data.type !== 'command') return;",
      "  window.parent.postMessage({ source: 'electric-field-sim', type: 'command-result', payload: { id: data.id, command: data.command, ok: true } }, '*');",
      '});',
      'window.setTimeout(function () {',
      "  window.parent.postMessage({ source: 'electric-field-sim', type: 'ready', payload: { mode: 'view' } }, '*');",
      '}, 5200);',
      '</script></body></html>'
    ].join('');
    const viewerBlob = new Blob([delayedViewerHtml], { type: 'text/html' });
    const viewerPath = URL.createObjectURL(viewerBlob);

    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      play: () => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      viewerPath
    });

    const mount = document.createElement('div');
    mount.id = 'embed-delayed-ready-command';
    document.body.appendChild(mount);
    app.inject(mount);

    try {
      const result = await app.play()
        .then(() => ({ status: 'resolved' as const }))
        .catch((error: unknown) => {
          const payload = error as { code?: unknown; message?: unknown };
          return {
            status: 'rejected' as const,
            code: String(payload?.code ?? ''),
            message: String(payload?.message ?? '')
          };
        });
      app.destroy();
      URL.revokeObjectURL(viewerPath);
      return result;
    } catch (error) {
      app.destroy();
      URL.revokeObjectURL(viewerPath);
      throw error;
    }
  });

  expect((settled as { status?: unknown }).status).toBe('resolved');
});

test('embed sdk queued command times out when ready handshake never arrives', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const silentViewerHtml = '<!doctype html><html><body>silent viewer</body></html>';
    const viewerBlob = new Blob([silentViewerHtml], { type: 'text/html' });
    const viewerPath = URL.createObjectURL(viewerBlob);

    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      play: () => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      viewerPath
    });

    const mount = document.createElement('div');
    mount.id = 'embed-never-ready-timeout';
    document.body.appendChild(mount);
    app.inject(mount);

    const commandResult = app.play()
      .then(() => ({ status: 'resolved' as const }))
      .catch((error: unknown) => {
        const payload = error as { code?: unknown; message?: unknown };
        return {
          status: 'rejected' as const,
          code: String(payload?.code ?? ''),
          message: String(payload?.message ?? '')
        };
      });

    const timeoutResult = new Promise<{ status: 'pending' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'pending' }), 6800);
    });

    const result = await Promise.race([commandResult, timeoutResult]);
    app.destroy();
    URL.revokeObjectURL(viewerPath);
    return result;
  });

  expect((settled as { status?: unknown }).status).toBe('rejected');
  expect((settled as { code?: unknown }).code).toBe('timeout');
});

test('embed sdk rejects queued command with uncloneable payload instead of hanging', async ({ page }) => {
  await page.goto('/embed-host-test.html');

  const settled = await page.evaluate(async () => {
    const delayedViewerHtml = [
      '<!doctype html><html><body><script>',
      'window.setTimeout(function () {',
      "  window.parent.postMessage({ source: 'electric-field-sim', type: 'ready', payload: { mode: 'view' } }, '*');",
      '}, 100);',
      '</script></body></html>'
    ].join('');
    const viewerBlob = new Blob([delayedViewerHtml], { type: 'text/html' });
    const viewerPath = URL.createObjectURL(viewerBlob);

    const app = new (window as unknown as { ElectricFieldApp: new (options: Record<string, unknown>) => {
      inject: (target: HTMLElement) => HTMLIFrameElement;
      loadScene: (payload: unknown) => Promise<unknown>;
      destroy: () => void;
    } }).ElectricFieldApp({
      viewerPath
    });

    const mount = document.createElement('div');
    mount.id = 'embed-uncloneable-payload';
    document.body.appendChild(mount);
    app.inject(mount);

    const payload = {
      version: '2.0',
      // Structured clone of function should fail.
      badField: () => 1
    };

    const commandResult = app.loadScene(payload)
      .then(() => ({ status: 'resolved' as const }))
      .catch((error: unknown) => {
        const payloadError = error as { code?: unknown; message?: unknown; name?: unknown };
        return {
          status: 'rejected' as const,
          code: String(payloadError?.code ?? ''),
          message: String(payloadError?.message ?? ''),
          name: String(payloadError?.name ?? '')
        };
      });

    const timeoutResult = new Promise<{ status: 'pending' }>((resolve) => {
      window.setTimeout(() => resolve({ status: 'pending' }), 1800);
    });

    const result = await Promise.race([commandResult, timeoutResult]);
    app.destroy();
    URL.revokeObjectURL(viewerPath);
    return result;
  });

  expect((settled as { status?: unknown }).status).toBe('rejected');
});
