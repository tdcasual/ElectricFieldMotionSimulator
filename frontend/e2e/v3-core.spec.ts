import { expect, test } from '@playwright/test';

async function readObjectCount(page: import('@playwright/test').Page) {
  const footer = page.locator('#footer');
  const text = await footer.textContent();
  const match = text?.match(/Objects:\s*(\d+)/);
  return match ? Number(match[1]) : NaN;
}

test.describe('v3 core path', () => {
  test('create edit play and reset flow works', async ({ page }, testInfo) => {
    await page.goto('/');

    await expect(page.locator('#status-text')).toContainText('V3 Runtime Ready');
    await page.getByRole('button', { name: '带电粒子' }).click();
    await expect.poll(() => readObjectCount(page)).toBe(1);

    if (testInfo.project.name === 'phone-chromium') {
      return;
    }

    await page.getByRole('button', { name: 'Play' }).click();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect.poll(() => readObjectCount(page)).toBe(0);

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('#status-text')).toContainText('已重置');
  });

  test('desktop save and load scene works', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'save/load flow only covered on desktop');

    await page.goto('/');
    await page.getByRole('button', { name: '带电粒子' }).click();
    await expect.poll(() => readObjectCount(page)).toBe(1);

    await page.getByRole('textbox', { name: 'Scene' }).fill('pw-v3-core');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('#status-text')).toContainText('已保存');

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect.poll(() => readObjectCount(page)).toBe(0);

    await page.getByRole('button', { name: 'Load' }).click();
    await expect.poll(() => readObjectCount(page), { timeout: 10_000 }).toBe(1);
  });
});
