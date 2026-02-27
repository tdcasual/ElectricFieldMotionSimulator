import { test, expect } from '@playwright/test';

test('embed sdk bridge supports ready event and host commands', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/embed-host-test.html');

  await page.waitForFunction(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return !!harness && Array.isArray(harness.readyEvents) && harness.readyEvents.length > 0;
  });

  const ready = await page.evaluate(() => {
    const harness = (window as unknown as { __embedHarness?: { readyEvents?: unknown[] } }).__embedHarness;
    return harness?.readyEvents?.[harness.readyEvents.length - 1] ?? null;
  });
  expect(ready).toBeTruthy();
  expect(String((ready as { mode?: unknown }).mode ?? '')).toBe('view');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { play: () => Promise<unknown> } }).__embedHarness;
    await harness?.play();
  });
  const frame = page.frameLocator('#embed-frame');
  await expect(frame.locator('#play-label')).toHaveText('暂停');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { pause: () => Promise<unknown> } }).__embedHarness;
    await harness?.pause();
  });
  await expect(frame.locator('#play-label')).toHaveText('播放');

  await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    await harness?.loadScene({
      version: '1.0',
      settings: {},
      objects: [{ type: 'particle' }]
    });
  });
  await expect(frame.locator('#object-count')).toContainText('1');

  const invalid = await page.evaluate(async () => {
    const harness = (window as unknown as { __embedHarness?: { loadScene: (payload: unknown) => Promise<unknown> } }).__embedHarness;
    try {
      await harness?.loadScene('invalid');
      return { ok: true };
    } catch (error) {
      return error;
    }
  });
  expect(String((invalid as { code?: unknown }).code ?? '')).toBe('validation');
});
