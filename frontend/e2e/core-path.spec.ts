import { test, expect } from '@playwright/test';

test('core path create/edit/play/io/demo', async ({ page }) => {
  await page.goto('/');
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

test('desktop context menu actions keep selection workflow coherent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-duplicate').click();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*2/);

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-properties').click();
  await expect(page.locator('#property-panel')).toBeVisible();
  await page.locator('#close-panel-btn').click();
  await expect(page.locator('#property-panel')).toBeHidden();

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-delete').click();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
});

test('desktop opening variables drawer hides any existing context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await page.locator('#variables-btn').click();
  await expect(page.getByTestId('variables-panel')).toBeVisible();
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop opening markdown board hides any existing context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await page.locator('#markdown-toggle-btn').click();
  await expect(page.getByTestId('markdown-board')).toBeVisible();
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop escape closes open context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop right-click on blank canvas area closes existing context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };
  const blank = { x: Math.max(8, box!.width * 0.08), y: Math.max(8, box!.height * 0.08) };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await canvas.click({ button: 'right', position: blank });
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop toggling demo mode hides existing context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await demoButton.click();
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop escape closes property drawer even after focus moves to header controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-properties').click();
  await expect(page.locator('#property-panel')).toBeVisible();

  const classroomButton = page.locator('#classroom-mode-btn');
  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#property-panel')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('desktop right-click on header closes existing context menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();

  await page.locator('#header').click({ button: 'right', position: { x: 24, y: 24 } });
  await expect(page.locator('#context-menu')).toBeHidden();
});

test('desktop scene settings keep boundary and timestep controls coherent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  const settingsPanel = page.locator('#header-settings-panel');
  await expect(settingsPanel).toBeVisible();

  await expect(page.locator('#boundary-mode-select')).toBeEnabled();
  await expect(page.locator('#boundary-margin-control')).toBeVisible();
  await page.locator('#boundary-mode-select').selectOption('remove');
  await expect(page.locator('#boundary-margin-control')).toBeHidden();
  await page.locator('#boundary-mode-select').selectOption('margin');
  await expect(page.locator('#boundary-margin-control')).toBeVisible();
  await expect(page.locator('#boundary-margin-input')).toBeEnabled();

  const slider = page.locator('#timestep-slider');
  const valueLabel = page.locator('#timestep-value');
  const beforeValue = await slider.inputValue();
  const beforeLabel = (await valueLabel.textContent())?.trim() ?? '';

  await slider.fill('0.03');
  await expect.poll(async () => slider.inputValue()).toBe('0.03');
  const afterLabel = (await valueLabel.textContent())?.trim() ?? '';

  expect(beforeValue).not.toBe('0.03');
  expect(afterLabel).not.toBe('');
  expect(afterLabel).not.toBe(beforeLabel);
});

test('desktop clear scene closes property drawer and clears objects coherently', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-properties').click();
  await expect(page.locator('#property-panel')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.locator('#clear-btn').click();

  await expect(page.locator('#object-count')).toHaveText(/对象:\s*0/);
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('desktop load scene closes property drawer and restores saved object count', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  const sceneName = `desktop-io-${Date.now()}`;

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(sceneName);
  });
  await page.locator('#save-btn').click();

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*2/);

  const canvas = page.locator('#particle-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.width / 2, y: box!.height / 2 };

  await canvas.click({ button: 'right', position: center });
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.locator('#menu-properties').click();
  await expect(page.locator('#property-panel')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(sceneName);
  });
  await page.locator('#load-btn').click();

  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);
  await expect(page.locator('#property-panel')).toBeHidden();
});

test('desktop load scene closes variables panel to avoid stale variable drafts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  const sceneName = `desktop-vars-${Date.now()}`;

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(sceneName);
  });
  await page.locator('#save-btn').click();

  await page.locator('#variables-btn').click();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept(sceneName);
  });
  await page.locator('#load-btn').click();

  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#variables-btn')).toHaveAttribute('aria-pressed', 'false');
});

test('desktop reset scene closes variables panel to avoid stale variable drafts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#toolbar .tool-item[data-type="particle"]').first().dblclick();
  await expect(page.locator('#object-count')).toHaveText(/对象:\s*1/);

  await page.locator('#variables-btn').click();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await page.locator('#reset-btn').click();
  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#variables-btn')).toHaveAttribute('aria-pressed', 'false');
});

test('desktop toggling demo mode closes variables panel to avoid stale variable drafts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const demoButton = page.locator('#demo-mode-btn');
  const demoPressed = await demoButton.getAttribute('aria-pressed');
  if (demoPressed === 'true') {
    await demoButton.click();
    await expect(demoButton).toHaveAttribute('aria-pressed', 'false');
  }

  await page.locator('#variables-btn').click();
  await expect(page.getByTestId('variables-panel')).toBeVisible();

  await demoButton.click();
  await expect(demoButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('variables-panel')).toBeHidden();
  await expect(page.locator('#variables-btn')).toHaveAttribute('aria-pressed', 'false');
});

test('desktop theme toggle keeps explicit label text coherent after switching themes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const themeButton = page.locator('#theme-toggle-btn');
  await expect(themeButton).toBeVisible();
  await expect(themeButton).toContainText('主题');

  const darkModeBefore = await page.evaluate(() => document.body.classList.contains('dark-theme'));
  await themeButton.click();
  await expect.poll(async () => page.evaluate(() => document.body.classList.contains('dark-theme'))).toBe(!darkModeBefore);

  await expect(themeButton).toContainText('主题');
});

test('desktop header keeps variables and markdown drawers mutually exclusive with synced button state', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const markdownButton = page.locator('#markdown-toggle-btn');
  const variablesPanel = page.getByTestId('variables-panel');
  const markdownBoard = page.getByTestId('markdown-board');

  await expect(variablesButton).toHaveAttribute('aria-pressed', 'false');
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'false');

  await variablesButton.click();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');
  await expect(variablesPanel).toBeVisible();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'false');

  await markdownButton.click();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'true');
  await expect(markdownBoard).toBeVisible();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'false');
  await expect(variablesPanel).toBeHidden();

  await markdownButton.click();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'false');
  await expect(markdownBoard).toBeHidden();
});

test('desktop variables button toggles panel open and close state coherently', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const variablesPanel = page.getByTestId('variables-panel');

  await expect(variablesButton).toHaveAttribute('aria-pressed', 'false');
  await expect(variablesPanel).toBeHidden();

  await variablesButton.click();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');
  await expect(variablesPanel).toBeVisible();

  await variablesButton.click();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'false');
  await expect(variablesPanel).toBeHidden();
});

test('desktop escape closes markdown board even after focus moves to header controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const markdownButton = page.locator('#markdown-toggle-btn');
  const classroomButton = page.locator('#classroom-mode-btn');
  const markdownBoard = page.getByTestId('markdown-board');

  await markdownButton.click();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'true');
  await expect(markdownBoard).toBeVisible();

  // Move focus outside board host to ensure Escape still closes.
  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');
  await expect(markdownBoard).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(markdownBoard).toBeHidden();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'false');
});

test('desktop classroom mode toggle remains operable with drawer open and persists after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const appShell = page.getByTestId('app-shell');
  const classroomButton = page.locator('#classroom-mode-btn');
  const variablesButton = page.locator('#variables-btn');
  const variablesPanel = page.getByTestId('variables-panel');

  await expect(classroomButton).toHaveAttribute('aria-pressed', 'false');
  await expect(appShell).not.toHaveClass(/classroom-mode/);

  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');
  await expect(appShell).toHaveClass(/classroom-mode/);

  await variablesButton.click();
  await expect(variablesPanel).toBeVisible();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');

  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'false');
  await expect(appShell).not.toHaveClass(/classroom-mode/);
  await expect(variablesPanel).toBeVisible();

  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');
  await expect(appShell).toHaveClass(/classroom-mode/);
  await page.reload();

  await expect(page.getByTestId('app-shell')).toHaveClass(/classroom-mode/);
  await expect(page.locator('#classroom-mode-btn')).toHaveAttribute('aria-pressed', 'true');
});

test('desktop escape closes variables drawer even after focus moves to header controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const classroomButton = page.locator('#classroom-mode-btn');
  const variablesPanel = page.getByTestId('variables-panel');

  await variablesButton.click();
  await expect(variablesPanel).toBeVisible();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');

  // Move focus outside the drawer host to ensure Escape still works globally.
  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');
  await expect(variablesPanel).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(variablesPanel).toBeHidden();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'false');
});

test('desktop tab from header while drawer open returns focus into variables panel', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const classroomButton = page.locator('#classroom-mode-btn');
  const variablesPanel = page.getByTestId('variables-panel');
  const panelCloseButton = page.getByLabel('关闭变量表');

  await variablesButton.click();
  await expect(variablesPanel).toBeVisible();

  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Tab');
  await expect(panelCloseButton).toBeFocused();
});

test('desktop shift-tab from header while drawer open returns focus into variables panel end', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const classroomButton = page.locator('#classroom-mode-btn');
  const variablesPanel = page.getByTestId('variables-panel');
  const applyVariablesButton = page.getByTestId('apply-variables');

  await variablesButton.click();
  await expect(variablesPanel).toBeVisible();

  await classroomButton.click();
  await expect(classroomButton).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Shift+Tab');
  await expect(applyVariablesButton).toBeFocused();
});

test('desktop successful import keeps markdown board open for note continuity', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const markdownButton = page.locator('#markdown-toggle-btn');
  const markdownBoard = page.getByTestId('markdown-board');
  const markdownInput = page.locator('.markdown-input');

  await markdownButton.click();
  await expect(markdownBoard).toBeVisible();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: '编辑模式' }).click();
  await markdownInput.fill('# 导入前记录');

  const validScene = JSON.stringify({
    version: '2.0',
    objects: [],
    settings: {},
    variables: { a: 1 }
  });
  await page.setInputFiles('#import-file-input', {
    name: 'valid-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(validScene)
  });

  await expect(page.locator('#status-text')).toHaveText(/场景已导入/);
  await expect(markdownBoard).toBeVisible();
  await expect(markdownButton).toHaveAttribute('aria-pressed', 'true');
  await expect(markdownInput).toHaveValue('# 导入前记录');
});

test('desktop failed import keeps variables drawer open with current draft intact', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app-shell')).toBeVisible();

  const variablesButton = page.locator('#variables-btn');
  const variablesPanel = page.getByTestId('variables-panel');
  const variableNameInput = page.locator('.variables-grid .variables-input').first();

  await variablesButton.click();
  await expect(variablesPanel).toBeVisible();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');

  await variableNameInput.fill('draftVar');

  await page.setInputFiles('#import-file-input', {
    name: 'invalid-scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid-json')
  });

  await expect(page.locator('#status-text')).toHaveText(/导入失败/);
  await expect(variablesPanel).toBeVisible();
  await expect(variablesButton).toHaveAttribute('aria-pressed', 'true');
  await expect(variableNameInput).toHaveValue('draftVar');
});
