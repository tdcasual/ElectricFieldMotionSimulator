import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

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

test('phone more sheet import failure keeps state and interactions recoverable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*1/);

  const invalidPath = path.resolve(process.cwd(), 'output', 'playwright', 'fixtures', 'invalid-scene.json');
  fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
  fs.writeFileSync(invalidPath, '{invalid-json');

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-import-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();

  await page.setInputFiles('#import-file-input', invalidPath);
  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/导入失败/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*1/);

  await page.touchscreen.tap(centerX, centerY);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('phone more sheet legacy import is rejected with explicit v2 policy message', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const legacyScenePath = path.resolve(process.cwd(), 'output', 'playwright', 'fixtures', 'legacy-scene-v1.json');
  fs.mkdirSync(path.dirname(legacyScenePath), { recursive: true });
  fs.writeFileSync(legacyScenePath, JSON.stringify({
    version: '1.0',
    settings: {},
    objects: []
  }));

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-import-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();

  await page.setInputFiles('#import-file-input', legacyScenePath);

  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/2\.0/);
  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/migrate:scene-v1-v2/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*0/);
});

test('phone import -> quick-edit -> orientation switch keeps editing and nav interactions coherent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const legacyScenePath = path.resolve(process.cwd(), 'example-scene.json');

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-import-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await page.setInputFiles('#import-file-input', legacyScenePath);

  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/场景已导入/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*5/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="magnetic-field"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*6/);

  await page.touchscreen.tap(centerX + 20, centerY + 20);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.getByTestId('property-drawer')).toBeVisible();

  const quickX = page.locator('#quick-x');
  const beforeX = Number(await quickX.inputValue());
  expect(Number.isFinite(beforeX)).toBe(true);
  const nextX = Math.round(beforeX + 60);
  await quickX.fill(String(nextX));

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.getByTestId('property-drawer')).toBeVisible();
  await page.locator('[data-testid="apply-props"]').tap();
  await expect.poll(async () => Number(await quickX.inputValue())).toBe(nextX);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('property-drawer')).toBeVisible();
  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-scene-sheet"] .btn-icon').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeHidden();
  await expect(page.getByTestId('phone-bottom-nav')).toBeVisible();
});

test('phone import failure then success keeps follow-up edit and clear interactions recoverable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await addParticleFromPhoneSheet(page);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const invalidPath = path.resolve(process.cwd(), 'output', 'playwright', 'fixtures', 'invalid-scene-recovery.json');
  fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
  fs.writeFileSync(invalidPath, '{invalid-json');
  const legacyScenePath = path.resolve(process.cwd(), 'example-scene.json');

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-import-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await page.setInputFiles('#import-file-input', invalidPath);

  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/导入失败/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-import-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await page.setInputFiles('#import-file-input', legacyScenePath);

  await expect(page.locator('[data-testid="phone-status-strip"] .phone-status-text')).toHaveText(/场景已导入/);
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*5/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*2/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="magnetic-field"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*6/);

  await page.touchscreen.tap(centerX + 20, centerY + 20);
  await expect(page.getByTestId('object-action-bar')).toBeVisible();
  await page.locator('[data-testid="action-open-properties"]').tap();
  await expect(page.getByTestId('property-drawer')).toBeVisible();

  const quickX = page.locator('#quick-x');
  await expect(quickX).toBeVisible();
  const beforeX = Number(await quickX.inputValue());
  expect(Number.isFinite(beforeX)).toBe(true);
  const nextX = Math.round(beforeX + 50);
  await quickX.fill(String(nextX));
  await page.locator('[data-testid="apply-props"]').tap();
  await expect.poll(async () => Number(await quickX.inputValue())).toBe(nextX);
  await page.locator('#close-panel-btn').tap();
  await expect(page.locator('#property-panel')).toBeHidden();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.locator('#secondary-clear-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#particle-count')).toHaveText(/粒子:\s*0/);
});
