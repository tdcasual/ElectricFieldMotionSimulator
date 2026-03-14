import { test, expect } from '@playwright/test';
import { expectDemoModeState } from './helpers/assertions';

test('core path create/edit/play/io/demo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page.getByTestId('canvas-empty-state')).toBeVisible();

  await expectDemoModeState(page, {
    pressed: true,
    objectCount: 0,
    scaleDisabled: true,
    gravityDisabled: true,
    buttonLabel: '退出演示'
  });

  await page.locator('#demo-mode-btn').click();
  await expectDemoModeState(page, {
    pressed: false,
    objectCount: 0,
    scaleDisabled: false,
    gravityDisabled: false,
    buttonLabel: '演示模式'
  });

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.getByTestId('canvas-empty-state')).toBeHidden();
  await expect(page.getByTestId('desktop-teaching-rail')).toBeVisible();
  await expect(page.getByTestId('desktop-teaching-rail')).toContainText('准备播放');

  await expect(page.locator('#play-label')).toHaveText('播放');
  await page.locator('#play-pause-btn').click();
  await expect(page.locator('#play-label')).toHaveText('暂停');
  await page.locator('#play-pause-btn').click();
  await expect(page.locator('#play-label')).toHaveText('播放');

  await page.locator('#demo-mode-btn').click();
  await expectDemoModeState(page, {
    pressed: true,
    objectCount: 0,
    scaleDisabled: true,
    gravityDisabled: true,
    buttonLabel: '退出演示'
  });

  await page.locator('#demo-mode-btn').click();
  await expectDemoModeState(page, {
    pressed: false,
    objectCount: 1,
    scaleDisabled: false,
    gravityDisabled: false,
    buttonLabel: '演示模式'
  });

  await page.locator('button[data-preset="uniform-acceleration"]').click();
  await expect(page.locator('#object-count')).not.toHaveText(/对象:\s*0/);
});
