import { test, expect, type Page } from '@playwright/test';

async function dispatchTouchEventViaCdp(
  session: {
    send: (
      method: string,
      params?: Record<string, unknown>
    ) => Promise<unknown>;
  },
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  touchPoints: Array<{ x: number; y: number; radiusX?: number; radiusY?: number; id?: number; force?: number }>
) {
  await session.send('Input.dispatchTouchEvent', {
    type,
    touchPoints,
    modifiers: 0
  });
}

async function addParticleFromPhoneSheet(page: Page) {
  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
}

async function getCanvasCenter(page: Page) {
  const box = await page.locator('#particle-canvas').boundingBox();
  expect(box).not.toBeNull();
  return {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2
  };
}

async function selectCenterObject(page: Page, x: number, y: number) {
  await page.touchscreen.tap(x, y);
  const actionBar = page.getByTestId('object-action-bar');
  const selected = await actionBar.isVisible().catch(() => false);
  if (selected) return;

  const refreshed = await getCanvasCenter(page);
  if (Math.abs(refreshed.x - x) > 0.5 || Math.abs(refreshed.y - y) > 0.5) {
    await page.touchscreen.tap(refreshed.x, refreshed.y);
  }

  await expect(actionBar).toBeVisible();
}

async function openPropertyPanelFromActionBar(page: Page) {
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.locator('#property-panel')).toBeVisible();
}

test('long-press with micro-jitter opens property panel on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await page.touchscreen.tap(x, y);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  const cdpSession = await page.context().newCDPSession(page);

  await dispatchTouchEventViaCdp(cdpSession, 'touchStart', [
    { x, y, radiusX: 3, radiusY: 3, id: 1, force: 1 }
  ]);
  await page.waitForTimeout(80);
  await dispatchTouchEventViaCdp(cdpSession, 'touchMove', [
    { x: x + 4, y: y + 1, radiusX: 3, radiusY: 3, id: 1, force: 1 }
  ]);
  await page.waitForTimeout(620);
  await dispatchTouchEventViaCdp(cdpSession, 'touchEnd', []);

  await expect(page.locator('#property-panel')).toBeVisible();
});

test('pinch gesture should reset double-tap chain before next single tap', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  // First tap selects object and starts double-tap timing window.
  await page.touchscreen.tap(x, y);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await expect(page.locator('#property-panel')).toBeHidden();

  const cdpSession = await page.context().newCDPSession(page);
  await dispatchTouchEventViaCdp(cdpSession, 'touchStart', [
    { x: x - 30, y, radiusX: 3, radiusY: 3, id: 1, force: 1 },
    { x: x + 30, y, radiusX: 3, radiusY: 3, id: 2, force: 1 }
  ]);
  await dispatchTouchEventViaCdp(cdpSession, 'touchMove', [
    { x: x - 45, y, radiusX: 3, radiusY: 3, id: 1, force: 1 },
    { x: x + 45, y, radiusX: 3, radiusY: 3, id: 2, force: 1 }
  ]);
  await dispatchTouchEventViaCdp(cdpSession, 'touchEnd', []);

  await page.waitForTimeout(80);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('edit mode pinch should change zoom and keep tap-chain behavior stable on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const phoneViewport = page.viewportSize() ?? { width: 390, height: 844 };
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator('#demo-mode-btn')).toBeVisible();
  const demoPressed = await page.locator('#demo-mode-btn').getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await page.locator('#demo-mode-btn').click();
    await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', 'false');
  }

  await page.setViewportSize(phoneViewport);
  await expect(page.getByTestId('phone-bottom-nav')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  await page.touchscreen.tap(x, y);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  const sceneSheet = page.getByTestId('phone-scene-sheet');
  await expect(sceneSheet).toBeVisible();
  const scaleInput = sceneSheet.locator('#scale-px-per-meter');
  await expect(scaleInput).toBeEnabled();
  const beforeZoom = Number(await scaleInput.inputValue());
  await sceneSheet.locator('.btn-icon').tap();
  await expect(sceneSheet).toBeHidden();

  const cdpSession = await page.context().newCDPSession(page);
  await dispatchTouchEventViaCdp(cdpSession, 'touchStart', [
    { x: x - 30, y, radiusX: 3, radiusY: 3, id: 1, force: 1 },
    { x: x + 30, y, radiusX: 3, radiusY: 3, id: 2, force: 1 }
  ]);
  await dispatchTouchEventViaCdp(cdpSession, 'touchMove', [
    { x: x - 45, y, radiusX: 3, radiusY: 3, id: 1, force: 1 },
    { x: x + 45, y, radiusX: 3, radiusY: 3, id: 2, force: 1 }
  ]);
  await dispatchTouchEventViaCdp(cdpSession, 'touchEnd', []);

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(sceneSheet).toBeVisible();
  const afterZoom = Number(await sceneSheet.locator('#scale-px-per-meter').inputValue());
  await sceneSheet.locator('.btn-icon').tap();
  await expect(sceneSheet).toBeHidden();

  expect(afterZoom).toBeGreaterThan(beforeZoom);

  await page.waitForTimeout(80);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('tap blank area resets tap chain before reopening properties', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;
  const blankX = box!.x + box!.width * 0.1;
  const blankY = box!.y + box!.height * 0.1;

  const phoneNav = page.locator('#phone-bottom-nav');
  const isPhoneLayout = await phoneNav.isVisible().catch(() => false);

  if (isPhoneLayout) {
    await page.locator('#phone-nav-add-btn').tap();
    await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
    await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
    await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  } else {
    const tool = page.locator('#toolbar .tool-item[data-type="particle"]').first();
    await tool.tap();
    await page.touchscreen.tap(centerX, centerY);
  }

  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();

  await page.touchscreen.tap(blankX, blankY);
  await expect(page.getByTestId('object-action-bar')).toBeHidden();

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('phone selected sheet pins recently edited geometry field to top', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="magnetic-field"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();

  await page.locator('#phone-nav-selected-btn').tap();
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  await expect(selectedSheet).toBeVisible();

  const getDisplaySourceKeyOrder = async () => {
    const ids = await selectedSheet.locator('.phone-selected-geometry-field input[id$="-display"]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('id') || '')
    );
    return ids
      .map((id) => {
        const match = id.match(/^phone-selected-(.+)-display$/);
        return match ? match[1] : '';
      })
      .filter((key) => key.length > 0);
  };

  const beforeOrder = await getDisplaySourceKeyOrder();
  expect(beforeOrder.length).toBeGreaterThan(1);
  const targetSourceKey = beforeOrder[1];
  const targetDisplayInput = selectedSheet.locator(`#phone-selected-${targetSourceKey}-display`);

  await targetDisplayInput.evaluate((node) => {
    const input = node as HTMLInputElement;
    const current = Number(input.value);
    const next = Number.isFinite(current) ? current + 12 : 120;
    input.value = String(next);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await expect.poll(async () => (await getDisplaySourceKeyOrder())[0]).toBe(targetSourceKey);
});

test('phone selected sheet actions stay reachable and keep state transitions coherent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);

  await page.locator('#phone-nav-selected-btn').tap();
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  await expect(selectedSheet).toBeVisible();

  const propertiesButton = selectedSheet.locator('#phone-selected-properties-btn');
  const duplicateButton = selectedSheet.locator('#phone-selected-duplicate-btn');
  const deleteButton = selectedSheet.locator('#phone-selected-delete-btn');

  const propertiesHeight = await propertiesButton.evaluate((el) => el.getBoundingClientRect().height);
  const duplicateHeight = await duplicateButton.evaluate((el) => el.getBoundingClientRect().height);
  const deleteHeight = await deleteButton.evaluate((el) => el.getBoundingClientRect().height);
  expect(propertiesHeight).toBeGreaterThanOrEqual(44);
  expect(duplicateHeight).toBeGreaterThanOrEqual(44);
  expect(deleteHeight).toBeGreaterThanOrEqual(44);

  await duplicateButton.tap();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*2/);
  await expect(selectedSheet).toBeVisible();

  await propertiesButton.tap();
  await expect(page.locator('#property-panel')).toBeVisible();
  await expect(selectedSheet).toBeHidden();

  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();
  await selectCenterObject(page, centerX, centerY);
  await page.locator('#phone-nav-selected-btn').tap();
  await expect(selectedSheet).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await deleteButton.tap();

  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(selectedSheet).toBeHidden();
});

test('phone object action bar duplicate and delete actions remain coherent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);

  const actionBar = page.getByTestId('object-action-bar');
  await expect(actionBar).toBeVisible();
  await page.locator('[data-testid="action-duplicate"]').tap();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*2/);
  await expect(actionBar).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.locator('[data-testid="action-delete"]').tap();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(actionBar).toBeHidden();
});

test('phone more sheet theme toggle closes sheet and applies theme change', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  const moreSheet = page.getByTestId('phone-more-sheet');
  await expect(moreSheet).toBeVisible();

  const darkModeBefore = await page.evaluate(() => document.body.classList.contains('dark-theme'));
  await page.locator('#secondary-theme-btn').tap();
  await expect(moreSheet).toBeHidden();
  await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-theme'))).toBe(!darkModeBefore);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(moreSheet).toBeVisible();
});

test('phone more sheet save-load-clear flow stays coherent under dialogs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('phone-sheet-e2e');
  });
  await page.locator('#secondary-save-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*2/);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('phone-sheet-e2e');
  });
  await page.locator('#secondary-load-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.locator('#secondary-clear-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeHidden();
});

test('phone drag gesture keeps geometry overlay badge hidden outside resize handles', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="magnetic-field"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const badge = page.getByTestId('geometry-overlay-badge');
  await expect(badge).toBeHidden();

  const resizeStartX = centerX + 12;
  const resizeStartY = centerY + 12;
  await page.mouse.move(resizeStartX, resizeStartY);
  await page.mouse.down();
  await page.mouse.move(resizeStartX - 48, resizeStartY - 36, { steps: 8 });

  await expect.poll(async () => badge.isVisible()).toBe(false);

  await page.mouse.up();
  await expect.poll(async () => badge.isVisible()).toBe(false);

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});


test('phone status strip metrics stay synchronized with object and particle counters', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const metrics = page.locator('[data-testid="phone-status-strip"] .phone-status-metrics');
  await expect(metrics).toHaveText(/对象\s*0\s*·\s*粒子\s*0/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*0/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await expect(metrics).toHaveText(/对象\s*1\s*·\s*粒子\s*1/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*1/);

  await selectCenterObject(page, centerX, centerY);
  await page.locator('#phone-nav-selected-btn').tap();
  await expect(page.getByTestId('phone-selected-sheet')).toBeVisible();
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.locator('#phone-selected-delete-btn').tap();
  await expect(page.getByTestId('phone-selected-sheet')).toBeHidden();

  await expect(metrics).toHaveText(/对象\s*0\s*·\s*粒子\s*0/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*0/);
});

test('phone property quick-edit apply keeps selection active for continued adjustments', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="magnetic-field"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.touchscreen.tap(centerX + 20, centerY + 20);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.getByTestId('property-drawer')).toBeVisible();
  await expect(page.getByTestId('property-quick-edit')).toBeVisible();

  const quickX = page.locator('#quick-x');
  const quickY = page.locator('#quick-y');
  const oldX = Number(await quickX.inputValue());
  const oldY = Number(await quickY.inputValue());
  expect(Number.isFinite(oldX)).toBe(true);
  expect(Number.isFinite(oldY)).toBe(true);

  const moveDeltaX = Math.min(120, Math.max(40, Math.floor(box!.width - oldX - 30)));
  const nextX = Math.round(oldX + moveDeltaX);
  await quickX.fill(String(nextX));
  await page.locator('[data-testid="apply-props"]').tap();
  await expect.poll(async () => Number(await quickX.inputValue())).toBe(nextX);

  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  const blankX = box!.x + Math.max(10, box!.width * 0.08);
  const blankY = box!.y + Math.max(10, box!.height * 0.08);
  await page.mouse.click(blankX, blankY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();

  await page.mouse.click(box!.x + nextX + 20, box!.y + oldY + 20);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
});

