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

async function selectCenterObject(page: Page, x: number, y: number) {
  await page.touchscreen.tap(x, y);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
}

async function openPropertyPanelFromActionBar(page: Page) {
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.locator('#property-panel')).toBeVisible();
}

test('touch path place object and double-tap open property panel', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * 0.55;
  const y = box!.y + box!.height * 0.45;
  let targetX = x;
  let targetY = y;

  const phoneNav = page.locator('#phone-bottom-nav');
  const isPhoneLayout = await phoneNav.isVisible().catch(() => false);

  if (isPhoneLayout) {
    await page.locator('#phone-nav-add-btn').tap();
    await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
    await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
    await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
    targetX = box!.x + box!.width / 2;
    targetY = box!.y + box!.height / 2;
  } else {
    const tool = page.locator('#toolbar .tool-item[data-type="particle"]').first();
    await tool.tap();
    await page.touchscreen.tap(x, y);
  }

  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.touchscreen.tap(targetX, targetY);
  await page.touchscreen.tap(targetX, targetY);

  await expect(page.locator('#property-panel')).toBeVisible();
  await expect(page.getByTestId('object-action-bar')).toBeHidden();
});

test('long-press with micro-jitter opens property panel on phone', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only real touch long-press check');
  }

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

test('pinch gesture should reset double-tap chain before next single tap', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only touch sequence check');
  }

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

test('edit mode pinch should change zoom and keep tap-chain behavior stable on phone', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only touch sequence check');
  }

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
  await page.goto('http://127.0.0.1:5173');
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

test('phone selected sheet pins recently edited geometry field to top', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only selected-sheet ordering check');
  }

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

test('phone sheet controls keep touch targets at least 44px', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only ergonomics check');
  }
  const phoneNav = page.locator('#phone-bottom-nav');
  await expect(phoneNav).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();

  const sceneCloseButtonHeight = await page.locator('[data-testid="phone-scene-sheet"] .btn-icon').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const gravityInputHeight = await page.locator('[data-testid="phone-scene-sheet"] #gravity-input').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const boundarySelectHeight = await page.locator('[data-testid="phone-scene-sheet"] #boundary-mode-select').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  expect(sceneCloseButtonHeight).toBeGreaterThanOrEqual(44);
  expect(gravityInputHeight).toBeGreaterThanOrEqual(44);
  expect(boundarySelectHeight).toBeGreaterThanOrEqual(44);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreExportButtonHeight = await page.locator('#secondary-export-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  expect(moreExportButtonHeight).toBeGreaterThanOrEqual(44);
});

test('phone header reset button keeps touch target at least 44px', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only ergonomics check');
  }

  const resetHeight = await page.locator('#reset-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  expect(resetHeight).toBeGreaterThanOrEqual(44);
});

test('phone form inputs keep zoom-safe font size', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only readability and input ergonomics check');
  }

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();

  const gravityFontSize = await page.locator('#gravity-input').evaluate((el) => {
    return Number.parseFloat(window.getComputedStyle(el).fontSize || '0');
  });
  expect(gravityFontSize).toBeGreaterThanOrEqual(16);
});

test('phone markdown and variables panels keep touch targets at least 44px', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only tool panel ergonomics check');
  }

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  const markdownFontInputHeight = await page.locator('.markdown-font-input').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const markdownTabHeight = await page.locator('.markdown-tab').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const markdownCloseHeight = await page.getByLabel('关闭题板').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.getByLabel('关闭题板').tap();
  await expect(page.getByTestId('markdown-board')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  const variablesInputHeight = await page.locator('.variables-input').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const variablesAddHeight = await page.locator('[data-testid="add-variable-row"]').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const variablesApplyHeight = await page.locator('[data-testid="apply-variables"]').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const variablesCloseHeight = await page.getByLabel('关闭变量表').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  expect(markdownFontInputHeight).toBeGreaterThanOrEqual(44);
  expect(markdownTabHeight).toBeGreaterThanOrEqual(44);
  expect(markdownCloseHeight).toBeGreaterThanOrEqual(44);
  expect(variablesInputHeight).toBeGreaterThanOrEqual(44);
  expect(variablesAddHeight).toBeGreaterThanOrEqual(44);
  expect(variablesApplyHeight).toBeGreaterThanOrEqual(44);
  expect(variablesCloseHeight).toBeGreaterThanOrEqual(44);
});

test('phone markdown and variables inputs keep zoom-safe font size', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only input zoom ergonomics check');
  }

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  const markdownFontInputSize = await page.locator('.markdown-font-input').evaluate((el) => {
    return Number.parseFloat(window.getComputedStyle(el).fontSize || '0');
  });
  expect(markdownFontInputSize).toBeGreaterThanOrEqual(16);

  await page.getByLabel('关闭题板').tap();
  await expect(page.getByTestId('markdown-board')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  const variablesInputSize = await page.locator('.variables-input').first().evaluate((el) => {
    return Number.parseFloat(window.getComputedStyle(el).fontSize || '0');
  });
  expect(variablesInputSize).toBeGreaterThanOrEqual(16);
});

test('phone wide landscape remains phone layout', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only layout check');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await expect(page.locator('#app')).toHaveClass(/layout-phone/);
});

test('swipe down on phone scene sheet header closes sheet', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only gesture check');
  }
  const phoneNav = page.locator('#phone-bottom-nav');
  await expect(phoneNav).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  const sceneSheet = page.getByTestId('phone-scene-sheet');
  await expect(sceneSheet).toBeVisible();

  const header = page.locator('[data-testid="phone-scene-sheet"] .phone-sheet-header');
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  const startX = headerBox!.x + headerBox!.width / 2;
  const startY = headerBox!.y + headerBox!.height / 2;
  const endY = headerBox!.y + headerBox!.height + 120;
  await header.dispatchEvent('pointerdown', {
    bubbles: true,
    pointerType: 'touch',
    pointerId: 11,
    clientX: startX,
    clientY: startY
  });
  await page.locator('body').dispatchEvent('pointerup', {
    bubbles: true,
    pointerType: 'touch',
    pointerId: 11,
    clientX: startX + 2,
    clientY: endY
  });

  await expect(sceneSheet).toBeHidden();
});

test('rapid phone sheet switching then backdrop tap leaves no sheet open', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only sheet race check');
  }

  await page.locator('#phone-nav-add-btn').tap();
  await page.locator('#phone-nav-scene-btn').tap();
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();

  const appBox = await page.locator('#app').boundingBox();
  expect(appBox).not.toBeNull();
  await page.touchscreen.tap(appBox!.x + appBox!.width / 2, appBox!.y + 120);

  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.getByTestId('phone-scene-sheet')).toBeHidden();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await expect(page.locator('.phone-sheet-backdrop')).toBeHidden();
});

test('orientation switch while sheet open clears stale sheet state and keeps nav usable', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only orientation race check');
  }

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('phone-scene-sheet')).toBeHidden();
  await expect(page.locator('.phone-sheet-backdrop')).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
});

test('phone density toggle changes property panel row density', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only density check');
  }

  const phoneNav = page.locator('#phone-bottom-nav');
  await expect(phoneNav).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreSaveBefore = await page.locator('#secondary-save-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  const rowBefore = await page.locator('#property-panel .section-toggle').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const inputBefore = await page.locator('#property-panel .property-value input, #property-panel .property-value select').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const closeButtonBefore = await page.locator('#close-panel-btn').evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  await page.locator('[data-testid="density-toggle"]').tap();

  const rowAfter = await page.locator('#property-panel .section-toggle').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  const inputAfter = await page.locator('#property-panel .property-value input, #property-panel .property-value select').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreSaveAfter = await page.locator('#secondary-save-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  expect(rowBefore).toBeGreaterThanOrEqual(44);
  expect(inputBefore).toBeGreaterThanOrEqual(44);
  expect(closeButtonBefore.width).toBeGreaterThanOrEqual(44);
  expect(closeButtonBefore.height).toBeGreaterThanOrEqual(44);
  expect(rowAfter).toBeGreaterThan(rowBefore);
  expect(inputAfter).toBeGreaterThan(inputBefore);
  expect(moreSaveAfter).toBeGreaterThan(moreSaveBefore);
});

test('property panel keeps phone play control reachable and tappable', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only reachability check');
  }

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  const playButton = page.locator('#phone-nav-play-btn');
  const sceneButton = page.locator('#phone-nav-scene-btn');
  await expect(sceneButton).toBeDisabled();
  await expect(playButton).toBeVisible();
  await expect(playButton).toHaveText('播放');
  await playButton.tap();
  await expect(playButton).toHaveText('暂停');
});

test('closing property panel clears stale tap chain before next single tap', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only tap-chain regression check');
  }

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.locator('#property-panel')).toBeVisible();

  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  // Keep the interval within double-tap window to expose stale-chain regressions.
  await page.waitForTimeout(40);
  await page.touchscreen.tap(centerX, centerY);

  await expect(page.locator('#property-panel')).toBeHidden();
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
});

test('object action bar stays above safe-area-aware phone nav', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only safe area overlap check');
  }

  await page.locator('#app').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--phone-safe-bottom-inset', '34px');
  });

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  await page.touchscreen.tap(centerX, centerY);
  const actionBar = page.getByTestId('object-action-bar');
  const phoneNav = page.locator('#phone-bottom-nav');
  await expect(actionBar).toBeVisible();
  await expect(phoneNav).toBeVisible();

  const actionBarBox = await actionBar.boundingBox();
  const phoneNavBox = await phoneNav.boundingBox();
  expect(actionBarBox).not.toBeNull();
  expect(phoneNavBox).not.toBeNull();
  const actionBarBottom = actionBarBox!.y + actionBarBox!.height;
  const phoneNavTop = phoneNavBox!.y;
  expect(actionBarBottom).toBeLessThanOrEqual(phoneNavTop);
});

test('phone landscape keeps nav and header controls inside safe-area insets', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only landscape safe area check');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-left-inset', '44px');
    app.style.setProperty('--phone-safe-right-inset', '44px');
  });

  const nav = page.locator('#phone-bottom-nav');
  const addButton = page.locator('#phone-nav-add-btn');
  const moreButton = page.locator('#phone-nav-more-btn');
  const resetButton = page.locator('#reset-btn');

  await expect(addButton).toBeVisible();
  await expect(moreButton).toBeVisible();
  await expect(resetButton).toBeVisible();

  const navBox = await nav.boundingBox();
  const addBox = await addButton.boundingBox();
  const moreBox = await moreButton.boundingBox();
  const resetBox = await resetButton.boundingBox();

  expect(navBox).not.toBeNull();
  expect(addBox).not.toBeNull();
  expect(moreBox).not.toBeNull();
  expect(resetBox).not.toBeNull();

  const safeInset = 44;
  const leftBound = navBox!.x + safeInset;
  const rightBound = navBox!.x + navBox!.width - safeInset;
  const moreRight = moreBox!.x + moreBox!.width;

  expect(addBox!.x).toBeGreaterThanOrEqual(leftBound);
  expect(moreRight).toBeLessThanOrEqual(rightBound);
  expect(resetBox!.x).toBeGreaterThanOrEqual(safeInset);
});

test('phone sheet header actions stay inside landscape safe-area insets', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only landscape sheet safe area check');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-left-inset', '44px');
    app.style.setProperty('--phone-safe-right-inset', '44px');
  });

  await page.locator('#phone-nav-scene-btn').tap();
  const sceneSheet = page.getByTestId('phone-scene-sheet');
  await expect(sceneSheet).toBeVisible();

  const closeButton = page.locator('[data-testid="phone-scene-sheet"] .phone-sheet-header .btn-icon');
  await expect(closeButton).toBeVisible();
  const closeButtonBox = await closeButton.boundingBox();
  expect(closeButtonBox).not.toBeNull();
  const closeButtonRight = closeButtonBox!.x + closeButtonBox!.width;

  const safeInset = 44;
  const rightSafeBound = 844 - safeInset;
  expect(closeButtonRight).toBeLessThanOrEqual(rightSafeBound);
  expect(closeButtonBox!.x).toBeGreaterThanOrEqual(safeInset);
});

test('phone sheet body controls stay inside landscape safe-area insets', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only landscape sheet body safe area check');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-left-inset', '44px');
    app.style.setProperty('--phone-safe-right-inset', '44px');
  });

  await page.locator('#phone-nav-scene-btn').tap();
  const sceneSheet = page.getByTestId('phone-scene-sheet');
  await expect(sceneSheet).toBeVisible();

  const firstControl = page.locator('[data-testid="phone-scene-sheet"] .phone-scene-body .control-label').first();
  await expect(firstControl).toBeVisible();
  const controlBox = await firstControl.boundingBox();
  expect(controlBox).not.toBeNull();
  const controlRight = controlBox!.x + controlBox!.width;

  const safeInset = 44;
  const rightSafeBound = 844 - safeInset;
  expect(controlBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(controlRight).toBeLessThanOrEqual(rightSafeBound);
});

test('phone property panel controls stay inside landscape safe-area insets', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only property panel safe area check');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-left-inset', '44px');
    app.style.setProperty('--phone-safe-right-inset', '44px');
  });

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  const closeButton = page.locator('#close-panel-btn');
  const densityButton = page.locator('[data-testid="density-toggle"]');
  const firstToggle = page.locator('#property-panel .section-toggle').first();
  await expect(closeButton).toBeVisible();
  await expect(densityButton).toBeVisible();
  await expect(firstToggle).toBeVisible();

  const closeBox = await closeButton.boundingBox();
  const densityBox = await densityButton.boundingBox();
  const toggleBox = await firstToggle.boundingBox();
  expect(closeBox).not.toBeNull();
  expect(densityBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();

  const safeInset = 44;
  const rightSafeBound = 844 - safeInset;
  const closeRight = closeBox!.x + closeBox!.width;
  const densityRight = densityBox!.x + densityBox!.width;
  const toggleRight = toggleBox!.x + toggleBox!.width;

  expect(closeBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(closeRight).toBeLessThanOrEqual(rightSafeBound);
  expect(densityBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(densityRight).toBeLessThanOrEqual(rightSafeBound);
  expect(toggleBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(toggleRight).toBeLessThanOrEqual(rightSafeBound);
});

test('phone markdown and variables sheet controls stay inside landscape safe-area insets', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only landscape safe area check for utility sheets');
  }

  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-left-inset', '44px');
    app.style.setProperty('--phone-safe-right-inset', '44px');
  });

  const safeInset = 44;
  const rightSafeBound = 844 - safeInset;

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  const markdownClose = page.getByLabel('关闭题板');
  const markdownInput = page.locator('.markdown-font-input');
  await expect(markdownClose).toBeVisible();
  await expect(markdownInput).toBeVisible();

  const markdownCloseBox = await markdownClose.boundingBox();
  const markdownInputBox = await markdownInput.boundingBox();
  expect(markdownCloseBox).not.toBeNull();
  expect(markdownInputBox).not.toBeNull();
  const markdownCloseRight = markdownCloseBox!.x + markdownCloseBox!.width;
  const markdownInputRight = markdownInputBox!.x + markdownInputBox!.width;

  expect(markdownCloseBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(markdownCloseRight).toBeLessThanOrEqual(rightSafeBound);
  expect(markdownInputBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(markdownInputRight).toBeLessThanOrEqual(rightSafeBound);

  await markdownClose.tap();
  await expect(page.getByTestId('markdown-board')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  const variablesClose = page.getByLabel('关闭变量表');
  const variablesInput = page.locator('.variables-input').first();
  await expect(variablesClose).toBeVisible();
  await expect(variablesInput).toBeVisible();

  const variablesCloseBox = await variablesClose.boundingBox();
  const variablesInputBox = await variablesInput.boundingBox();
  expect(variablesCloseBox).not.toBeNull();
  expect(variablesInputBox).not.toBeNull();
  const variablesCloseRight = variablesCloseBox!.x + variablesCloseBox!.width;
  const variablesInputRight = variablesInputBox!.x + variablesInputBox!.width;

  expect(variablesCloseBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(variablesCloseRight).toBeLessThanOrEqual(rightSafeBound);
  expect(variablesInputBox!.x).toBeGreaterThanOrEqual(safeInset);
  expect(variablesInputRight).toBeLessThanOrEqual(rightSafeBound);
});

test('phone variables sheet footer stays above bottom safe-area inset', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only bottom safe area check for variables sheet');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-bottom-inset', '34px');
  });

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  const applyButton = page.locator('[data-testid="apply-variables"]');
  await expect(applyButton).toBeVisible();
  const applyBox = await applyButton.boundingBox();
  expect(applyBox).not.toBeNull();

  const bottomSafeBound = 844 - 34;
  const applyBottom = applyBox!.y + applyBox!.height;
  expect(applyBottom).toBeLessThanOrEqual(bottomSafeBound);
});

test('phone markdown sheet uses bottom space tightly when nav is hidden', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only markdown bottom spacing check');
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#app').evaluate((element) => {
    const app = element as HTMLElement;
    app.style.setProperty('--phone-safe-bottom-inset', '34px');
  });

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  const markdownBoard = page.getByTestId('markdown-board');
  await expect(markdownBoard).toBeVisible();

  const boardBox = await markdownBoard.boundingBox();
  expect(boardBox).not.toBeNull();

  const boardBottomGap = 844 - (boardBox!.y + boardBox!.height);
  expect(boardBottomGap).toBeLessThanOrEqual(34);
});

test('phone landscape density toggle scales nav and sheet controls', async ({ page }, testInfo) => {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  if (testInfo.project.name !== 'phone-chromium') {
    test.skip(true, 'phone-only landscape density check');
  }

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  const navPlayBefore = await page.locator('#phone-nav-play-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreSaveBefore = await page.locator('#secondary-save-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  await page.locator('[data-testid="density-toggle"]').tap();
  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  const navPlayAfter = await page.locator('#phone-nav-play-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreSaveAfter = await page.locator('#secondary-save-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  expect(navPlayBefore).toBeGreaterThanOrEqual(44);
  expect(moreSaveBefore).toBeGreaterThanOrEqual(44);
  expect(navPlayAfter).toBeGreaterThan(navPlayBefore);
  expect(navPlayAfter).toBeGreaterThanOrEqual(44);
  expect(moreSaveAfter).toBeGreaterThan(moreSaveBefore);
  expect(moreSaveAfter).toBeGreaterThanOrEqual(44);
});
