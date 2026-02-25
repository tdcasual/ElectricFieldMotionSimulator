import { test, expect } from '@playwright/test';

test('core path create/edit/play/io/demo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#demo-mode-btn')).toContainText('退出演示');
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#scale-px-per-meter')).toBeDisabled();
  await expect(page.locator('#gravity-input')).toBeDisabled();

  await page.locator('#demo-mode-btn').click();
  await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#demo-mode-btn')).toContainText('演示模式');
  await expect(page.locator('#scale-px-per-meter')).toBeEnabled();
  await expect(page.locator('#gravity-input')).toBeEnabled();

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await expect(page.locator('#play-label')).toHaveText('播放');
  await page.locator('#play-pause-btn').click();
  await expect(page.locator('#play-label')).toHaveText('暂停');
  await page.locator('#play-pause-btn').click();
  await expect(page.locator('#play-label')).toHaveText('播放');

  await page.locator('#demo-mode-btn').click();
  await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#demo-mode-btn')).toContainText('退出演示');
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#scale-px-per-meter')).toBeDisabled();
  await expect(page.locator('#gravity-input')).toBeDisabled();

  await page.locator('#demo-mode-btn').click();
  await expect(page.locator('#demo-mode-btn')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#demo-mode-btn')).toContainText('演示模式');
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.locator('#scale-px-per-meter')).toBeEnabled();
  await expect(page.locator('#gravity-input')).toBeEnabled();

  await page.locator('button[data-preset="uniform-acceleration"]').click();
  await expect(page.locator('#object-count')).not.toHaveText(/对象:\s*0/);
});
