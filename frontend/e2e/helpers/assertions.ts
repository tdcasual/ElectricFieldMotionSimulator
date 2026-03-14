import { expect, type Page } from '@playwright/test';

export type PhoneSelectionUiState = 'none' | 'action-bar' | 'selected-sheet';

export async function expectPhoneMoreSheetVisible(page: Page) {
  await expect(page.getByTestId('phone-more-sheet')).toBeVisible();
}

export async function readPhoneSelectionUiState(page: Page): Promise<PhoneSelectionUiState> {
  const selectedSheet = page.getByTestId('phone-selected-sheet');
  if (await selectedSheet.isVisible().catch(() => false)) {
    return 'selected-sheet';
  }

  const actionBar = page.getByTestId('object-action-bar');
  if (await actionBar.isVisible().catch(() => false)) {
    return 'action-bar';
  }

  return 'none';
}

export async function expectPhoneSelectionUiVisible(page: Page) {
  await expect.poll(() => readPhoneSelectionUiState(page)).not.toBe('none');
}

export async function expectUtilityDrawerClosedAndMoreRestored(
  page: Page,
  drawerTestId: 'markdown-board' | 'variables-panel'
) {
  await expect(page.getByTestId(drawerTestId)).toBeHidden();
  await expectPhoneMoreSheetVisible(page);
}


export async function expectDemoModeState(
  page: Page,
  options: {
    pressed: boolean;
    objectCount: number;
    scaleDisabled: boolean;
    gravityDisabled: boolean;
    buttonLabel: string;
  }
) {
  await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', options.pressed ? 'true' : 'false');
  await expect(page.locator('#demo-mode-btn')).toContainText(options.buttonLabel);
  await expect(page.locator('#object-count')).toHaveText(new RegExp(`对象:\\s*${options.objectCount}`));
  const scaleInput = page.locator('#scale-px-per-meter');
  const gravityInput = page.locator('#gravity-input');
  if (!(await scaleInput.isVisible().catch(() => false))) {
    const settingsToggle = page.locator('#settings-tray-toggle-btn');
    if (await settingsToggle.isVisible().catch(() => false)) {
      const expanded = await settingsToggle.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await settingsToggle.click();
      }
      await expect(scaleInput).toBeVisible();
      await expect(gravityInput).toBeVisible();
    }
  }
  if (options.scaleDisabled) {
    await expect(scaleInput).toBeDisabled();
  } else {
    await expect(scaleInput).toBeEnabled();
  }
  if (options.gravityDisabled) {
    await expect(gravityInput).toBeDisabled();
  } else {
    await expect(gravityInput).toBeEnabled();
  }
}
