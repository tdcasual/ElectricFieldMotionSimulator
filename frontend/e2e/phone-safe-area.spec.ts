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

test('phone sheet controls keep touch targets at least 44px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
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
  const energyToggle = page.locator('#toggle-energy-overlay');
  const energyToggleSize = await energyToggle.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const energyToggleRow = page.locator('[data-testid="phone-scene-sheet"] .phone-scene-body .control-label').first();
  const energyBefore = await energyToggle.isChecked();
  const energyRowBox = await energyToggleRow.boundingBox();
  expect(energyRowBox).not.toBeNull();
  await page.touchscreen.tap(energyRowBox!.x + energyRowBox!.width / 2, energyRowBox!.y + energyRowBox!.height / 2);
  await expect.poll(async () => energyToggle.isChecked()).toBe(!energyBefore);

  expect(sceneCloseButtonHeight).toBeGreaterThanOrEqual(44);
  expect(gravityInputHeight).toBeGreaterThanOrEqual(44);
  expect(boundarySelectHeight).toBeGreaterThanOrEqual(44);
  expect(energyToggleSize.width).toBeGreaterThanOrEqual(24);
  expect(energyToggleSize.height).toBeGreaterThanOrEqual(24);

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  const moreExportButtonHeight = await page.locator('#secondary-export-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  expect(moreExportButtonHeight).toBeGreaterThanOrEqual(44);
});

test('phone header reset button keeps touch target at least 44px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const resetHeight = await page.locator('#reset-btn').evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  expect(resetHeight).toBeGreaterThanOrEqual(44);
});

test('phone header controls stay below top safe-area inset', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#app').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--phone-safe-top-inset', '44px');
  });

  const resetButton = page.locator('#reset-btn');
  const statusStrip = page.getByTestId('phone-status-strip');
  await expect(resetButton).toBeVisible();
  await expect(statusStrip).toBeVisible();

  const resetBox = await resetButton.boundingBox();
  const statusBox = await statusStrip.boundingBox();
  expect(resetBox).not.toBeNull();
  expect(statusBox).not.toBeNull();

  expect(resetBox!.y).toBeGreaterThanOrEqual(44);
  expect(statusBox!.y).toBeGreaterThanOrEqual(44);
});

test('phone form inputs keep zoom-safe font size', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();

  const gravityFontSize = await page.locator('#gravity-input').evaluate((el) => {
    return Number.parseFloat(window.getComputedStyle(el).fontSize || '0');
  });
  expect(gravityFontSize).toBeGreaterThanOrEqual(16);
});

test('phone property checkbox rows expose a full-height tap target', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  const checkboxField = page
    .locator('#property-panel .property-checkbox-field:has(input[type="checkbox"]:not(:disabled))')
    .first();
  await expect(checkboxField).toBeVisible();
  const checkboxInput = checkboxField.locator('input[type="checkbox"]').first();
  await expect(checkboxInput).toBeVisible();
  await checkboxField.scrollIntoViewIfNeeded();

  const fieldHeight = await checkboxField.evaluate((el) => {
    return el.getBoundingClientRect().height;
  });
  expect(fieldHeight).toBeGreaterThanOrEqual(44);

  const checkboxSize = await checkboxInput.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  expect(checkboxSize.width).toBeGreaterThanOrEqual(24);
  expect(checkboxSize.height).toBeGreaterThanOrEqual(24);

  const before = await checkboxInput.isChecked();
  const fieldBox = await checkboxField.boundingBox();
  expect(fieldBox).not.toBeNull();
  await page.touchscreen.tap(fieldBox!.x + Math.min(18, fieldBox!.width - 4), fieldBox!.y + fieldBox!.height / 2);
  await expect.poll(async () => checkboxInput.isChecked()).toBe(!before);
});

test('phone markdown and variables panels keep touch targets at least 44px', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone markdown and variables inputs keep zoom-safe font size', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone wide landscape remains phone layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await expect(page.locator('#app')).toHaveClass(/layout-phone/);
});

test('swipe down on phone scene sheet header closes sheet', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
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

test('rapid phone sheet switching then backdrop tap leaves no sheet open', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('orientation switch while sheet open clears stale sheet state and keeps nav usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone density toggle changes property panel row density', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('property panel keeps phone play control reachable and tappable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('closing property panel clears stale tap chain before next single tap', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('object action bar stays above safe-area-aware phone nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#app').evaluate((element) => {
    (element as HTMLElement).style.setProperty('--phone-safe-bottom-inset', '34px');
  });

  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  const center = await getCanvasCenter(page);
  await selectCenterObject(page, center.x, center.y);
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

test('phone landscape keeps nav and header controls inside safe-area insets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone sheet header actions stay inside landscape safe-area insets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone sheet body controls stay inside landscape safe-area insets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone property panel controls stay inside landscape safe-area insets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone markdown and variables sheet controls stay inside landscape safe-area insets', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone variables sheet footer stays above bottom safe-area inset', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone markdown sheet uses bottom space tightly when nav is hidden', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('phone utility drawer backdrop closes and restores nav interactions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const appBox = await page.locator('#app').boundingBox();
  expect(appBox).not.toBeNull();
  const backdropTapX = appBox!.x + appBox!.width / 2;
  const backdropTapY = appBox!.y + 80;

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();
  await page.touchscreen.tap(backdropTapX, backdropTapY);
  await expect(page.getByTestId('markdown-board')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();
  await page.touchscreen.tap(backdropTapX, backdropTapY);
  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('orientation switch with utility drawer open keeps state recoverable on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('variables-panel')).toBeVisible();
  await page.getByLabel('关闭变量表').tap();
  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
});

test('phone landscape density toggle scales nav and sheet controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

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

test('orientation switch with markdown board open keeps state recoverable on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('markdown-board')).toBeVisible();
  await page.getByLabel('关闭题板').tap();
  await expect(page.getByTestId('markdown-board')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('property drawer backdrop keeps close interaction recoverable after orientation switch', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('#property-panel')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#property-panel')).toBeVisible();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  const appBox = await page.locator('#app').boundingBox();
  expect(appBox).not.toBeNull();
  await page.touchscreen.tap(appBox!.x + appBox!.width / 2, appBox!.y + 100);

  await expect(page.locator('#property-panel')).toBeHidden();
  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('orientation switch keeps markdown backdrop close recoverable on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('markdown-board')).toBeVisible();

  const appBox = await page.locator('#app').boundingBox();
  expect(appBox).not.toBeNull();
  await page.touchscreen.tap(appBox!.x + appBox!.width / 2, appBox!.y + 80);

  await expect(page.getByTestId('markdown-board')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('orientation switch keeps variables backdrop close recoverable on phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  const appBox = await page.locator('#app').boundingBox();
  expect(appBox).not.toBeNull();
  await page.touchscreen.tap(appBox!.x + appBox!.width / 2, appBox!.y + 80);

  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
});

test('phone short landscape keeps scene sheet below header region', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-scene-btn').tap();
  const sceneSheet = page.getByTestId('phone-scene-sheet');
  await expect(sceneSheet).toBeVisible();

  const header = page.locator('#header');
  await expect(header).toBeVisible();
  const headerBox = await header.boundingBox();
  const sceneSheetBox = await sceneSheet.boundingBox();

  expect(headerBox).not.toBeNull();
  expect(sceneSheetBox).not.toBeNull();
  const headerBottom = headerBox!.y + headerBox!.height;
  expect(sceneSheetBox!.y).toBeGreaterThanOrEqual(headerBottom);
});

test('phone short landscape keeps property panel below header region', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await addParticleFromPhoneSheet(page);
  await selectCenterObject(page, centerX, centerY);
  await openPropertyPanelFromActionBar(page);

  const header = page.locator('#header');
  const propertyPanel = page.locator('#property-panel');
  await expect(header).toBeVisible();
  await expect(propertyPanel).toBeVisible();

  const headerBox = await header.boundingBox();
  const propertyPanelBox = await propertyPanel.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(propertyPanelBox).not.toBeNull();

  const headerBottom = headerBox!.y + headerBox!.height;
  expect(propertyPanelBox!.y).toBeGreaterThanOrEqual(headerBottom);
});

test('phone short landscape keeps markdown board below header region', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-markdown-btn').tap();
  const markdownBoard = page.getByTestId('markdown-board');
  await expect(markdownBoard).toBeVisible();

  const header = page.locator('#header');
  const headerBox = await header.boundingBox();
  const markdownBox = await markdownBoard.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(markdownBox).not.toBeNull();

  const headerBottom = headerBox!.y + headerBox!.height;
  expect(markdownBox!.y).toBeGreaterThanOrEqual(headerBottom);
});

test('phone short landscape keeps variables panel below header region', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.setViewportSize({ width: 744, height: 390 });
  await expect(page.locator('#phone-bottom-nav')).toBeVisible();
  await page.locator('#phone-nav-more-btn').tap();
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();
  const variablesSheet = page.locator('.variables-modal.variables-sheet');
  await expect(variablesSheet).toBeVisible();

  const header = page.locator('#header');
  const headerBox = await header.boundingBox();
  const variablesBox = await variablesSheet.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(variablesBox).not.toBeNull();

  const headerBottom = headerBox!.y + headerBox!.height;
  expect(variablesBox!.y).toBeGreaterThanOrEqual(headerBottom);
});
