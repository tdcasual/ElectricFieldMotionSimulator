import { expect, type Page } from '@playwright/test';
import {
  expectPhoneMoreSheetVisible,
  expectPhoneSelectionUiVisible,
  expectUtilityDrawerClosedAndMoreRestored,
  readPhoneSelectionUiState
} from './assertions';

async function openPhoneSheet(page: Page, navButtonSelector: string, sheetTestId: string) {
  const sheet = page.getByTestId(sheetTestId);
  if (await sheet.isVisible().catch(() => false)) {
    return sheet;
  }

  await page.locator(navButtonSelector).tap();
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function dismissPhoneSelectedSheetIfOpen(page: Page) {
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  if (!(await selectedSheet.isVisible().catch(() => false))) return;
  await selectedSheet.locator('.phone-sheet-header .btn-icon').tap();
  await expect(selectedSheet).toBeHidden();
}

export async function addParticleFromPhoneSheet(page: Page, options: { preserveSelectionUi?: boolean } = {}) {
  const addSheet = await openPhoneSheet(page, '#phone-nav-add-btn', 'phone-add-sheet');
  await addSheet.locator('.tool-item[data-type="particle"]').first().tap();
  await expect(addSheet).toBeHidden();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  if (!options.preserveSelectionUi) {
    await dismissPhoneSelectedSheetIfOpen(page);
  }
}

export async function selectCenterObject(page: Page, x: number, y: number) {
  if ((await readPhoneSelectionUiState(page)) !== 'none') {
    return;
  }

  await page.touchscreen.tap(x, y);
  await expectPhoneSelectionUiVisible(page);
}

export async function openPropertyPanelFromActionBar(page: Page) {
  await expectPhoneSelectionUiVisible(page);
  const selectedSheetButton = page.locator('#phone-selected-properties-btn');
  if (await selectedSheetButton.isVisible().catch(() => false)) {
    await selectedSheetButton.tap();
  } else {
    await page.locator('[data-testid="action-open-properties"]').tap();
  }
  await expect(page.locator('#property-panel')).toBeVisible();
}

export async function openPhoneMoreSheet(page: Page) {
  await openPhoneSheet(page, '#phone-nav-more-btn', 'phone-more-sheet');
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
  await openPhoneSheet(page, '#phone-nav-scene-btn', 'phone-scene-sheet');
}
