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

test('touch path place object and double-tap open property panel', async ({ page }) => {
  await page.goto('/');
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
