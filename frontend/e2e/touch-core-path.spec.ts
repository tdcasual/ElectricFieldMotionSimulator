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
