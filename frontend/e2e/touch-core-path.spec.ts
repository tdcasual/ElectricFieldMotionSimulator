import { test, expect } from '@playwright/test';

test('touch path place object and long-press open property panel', async ({ page }) => {
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
  await expect(page.getByTestId('object-action-bar')).toBeVisible();

  await page.touchscreen.tap(targetX, targetY);

  await expect(page.locator('#property-panel')).toBeVisible();
  await expect(page.getByTestId('object-action-bar')).toBeHidden();
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
  await header.dispatchEvent('pointerdown', {
    bubbles: true,
    pointerType: 'touch',
    clientX: 120,
    clientY: 160
  });
  await header.dispatchEvent('pointerup', {
    bubbles: true,
    pointerType: 'touch',
    clientX: 118,
    clientY: 250
  });

  await expect(sceneSheet).toBeHidden();
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

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.touchscreen.tap(centerX, centerY);
  await expect(page.locator('#property-panel')).toBeVisible();

  const rowBefore = await page.locator('#property-panel .section-toggle').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.locator('[data-testid="density-toggle"]').tap();

  const rowAfter = await page.locator('#property-panel .section-toggle').first().evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreSaveAfter = await page.locator('#secondary-save-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });

  expect(rowAfter).toBeGreaterThan(rowBefore);
  expect(moreSaveAfter).toBeGreaterThan(moreSaveBefore);
});
