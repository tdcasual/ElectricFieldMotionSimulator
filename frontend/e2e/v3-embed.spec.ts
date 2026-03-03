import { expect, test } from '@playwright/test';

test.describe('v3 embed path', () => {
  test('embed host receives ready event and command roundtrip', async ({ page }) => {
    await page.goto('/embed-host-test.html');

    await expect(page.locator('#embed-frame')).toBeVisible();
    await expect
      .poll(async () => {
        return page.evaluate(() => (window as unknown as {
          __embedHarness?: { readyEvents?: unknown[] }
        }).__embedHarness?.readyEvents?.length ?? 0);
      })
      .toBeGreaterThan(0);

    const playResult = await page.evaluate(async () => {
      const harness = (window as unknown as {
        __embedHarness: { play: () => Promise<unknown> }
      }).__embedHarness;
      try {
        return await harness.play();
      } catch (error) {
        return { ok: false, error: String(error) };
      }
    });
    expect(playResult).toEqual(expect.objectContaining({ ok: true }));

    await expect
      .poll(async () => {
        return page.evaluate(() => (window as unknown as {
          __embedHarness?: { commandResults?: Array<{ command?: string; ok?: boolean }> }
        }).__embedHarness?.commandResults?.some((item) => item.command === 'play' && item.ok === true) ?? false);
      })
      .toBe(true);
  });
});
