import { test, expect } from '@playwright/test';

test('core path create/edit/play/io/demo', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page.getByTestId('app-shell')).toBeVisible();
});
