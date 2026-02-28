import { expect, test, type Page } from '@playwright/test';

async function ensurePlaybackPaused(page: Page) {
  const desktopPlayButton = page.locator('#play-pause-btn');
  if (await desktopPlayButton.isVisible().catch(() => false)) {
    const desktopLabel = page.locator('#play-label');
    const currentLabel = (await desktopLabel.textContent())?.trim() ?? '';
    if (currentLabel === '暂停') {
      await desktopPlayButton.click();
      await expect(desktopLabel).toHaveText('播放');
    }
    return;
  }

  const phonePlayButton = page.locator('#phone-nav-play-btn');
  if (!(await phonePlayButton.isVisible().catch(() => false))) return;
  const currentLabel = (await phonePlayButton.textContent())?.trim() ?? '';
  if (currentLabel === '暂停') {
    await phonePlayButton.click();
    await expect(phonePlayButton).toHaveText('播放');
  }
}

async function stabilizeForScreenshot(page: Page) {
  await page.goto('http://127.0.0.1:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await page.addStyleTag({
    content: `
      * {
        transition: none !important;
        animation: none !important;
      }
      #fps-counter {
        visibility: hidden !important;
      }
    `
  });

  await ensurePlaybackPaused(page);

  const toolRailBackdrop = page.locator('.tool-rail-backdrop');
  if (await toolRailBackdrop.isVisible().catch(() => false)) {
    await toolRailBackdrop.click();
  }

  const settingsBackdrop = page.locator('.phone-settings-backdrop, .phone-sheet-backdrop');
  if (await settingsBackdrop.isVisible().catch(() => false)) {
    await settingsBackdrop.click();
  }

  await page.waitForTimeout(120);
}

test.describe('responsive visual baseline', () => {
  test('phone 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('responsive-phone-390x844.png', {
      animations: 'disabled',
      scale: 'css'
    });
  });

  test('tablet 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('responsive-tablet-768x1024.png', {
      animations: 'disabled',
      scale: 'css'
    });
  });

  test('desktop 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await stabilizeForScreenshot(page);
    await expect(page).toHaveScreenshot('responsive-desktop-1920x1080.png', {
      animations: 'disabled',
      scale: 'css'
    });
  });
});
