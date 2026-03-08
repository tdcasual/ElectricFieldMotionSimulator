import { expect, type Page } from '@playwright/test';
import { expectPhoneMoreSheetVisible, expectUtilityDrawerClosedAndMoreRestored } from './assertions';

export async function dismissPhoneSelectedSheetIfOpen(page: Page) {
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  if (!(await selectedSheet.isVisible().catch(() => false))) return;
  await selectedSheet.locator('.phone-sheet-header .btn-icon').tap();
  await expect(selectedSheet).toBeHidden();
}

export async function addParticleFromPhoneSheet(page: Page, options: { preserveSelectionUi?: boolean } = {}) {
  await page.locator('#phone-nav-add-btn').tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeVisible();
  await page.locator('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').first().tap();
  await expect(page.getByTestId('phone-add-sheet')).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  if (!options.preserveSelectionUi) {
    await dismissPhoneSelectedSheetIfOpen(page);
  }
}

export async function selectCenterObject(page: Page, x: number, y: number) {
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  const actionBar = page.getByTestId('object-action-bar');
  if ((await selectedSheet.isVisible().catch(() => false)) || (await actionBar.isVisible().catch(() => false))) {
    return;
  }

  await page.touchscreen.tap(x, y);
  await expect
    .poll(async () => {
      if (await selectedSheet.isVisible().catch(() => false)) return 'selected';
      if (await actionBar.isVisible().catch(() => false)) return 'action';
      return 'none';
    })
    .not.toBe('none');
}

export async function openPropertyPanelFromActionBar(page: Page) {
  const selectedSheetButton = page.locator('#phone-selected-properties-btn');
  if (await selectedSheetButton.isVisible().catch(() => false)) {
    await selectedSheetButton.tap();
  } else {
    await page.locator('[data-testid="action-open-properties"]').tap();
  }
  await expect(page.locator('#property-panel')).toBeVisible();
}

export async function openPhoneMoreSheet(page: Page) {
  const moreSheet = page.getByTestId('phone-more-sheet');
  if (await moreSheet.isVisible().catch(() => false)) {
    return;
  }

  await page.locator('#phone-nav-more-btn').tap();
  await expectPhoneMoreSheetVisible(page);
}

export async function openMarkdownFromPhoneMore(page: Page) {
  await openPhoneMoreSheet(page);
  await page.locator('#secondary-markdown-btn').tap();
  await expect(page.getByTestId('markdown-board')).toBeVisible();
}

export async function closeMarkdownBoardAndExpectMoreRestored(page: Page) {
  await page.getByLabel('关闭题板').tap();
  await expectUtilityDrawerClosedAndMoreRestored(page, 'markdown-board');
}

export async function openVariablesFromPhoneMore(page: Page) {
  await openPhoneMoreSheet(page);
  await page.locator('#secondary-variables-btn').tap();
  await expect(page.getByTestId('variables-panel')).toBeVisible();
}

export async function closeVariablesPanelAndExpectMoreRestored(page: Page) {
  await page.getByLabel('关闭变量表').tap();
  await expectUtilityDrawerClosedAndMoreRestored(page, 'variables-panel');
}

export async function openPhoneSceneSheet(page: Page) {
  await page.locator('#phone-nav-scene-btn').tap();
  await expect(page.getByTestId('phone-scene-sheet')).toBeVisible();
}
