# Phone Property Panel Density + Quick Edit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add phone-only compact/comfortable density toggle, quick edit group, and inline unit rendering for all object property panels.

**Architecture:** Persist a `phoneDensityMode` in the store and surface it as an `#app` class. PropertyDrawer renders a phone-only quick edit group built from the first N visible fields, skipping geometry display duplicates. Units are normalized into a `field.unit` and rendered inline in value column. CSS uses the density class to scale spacing, row heights, and panel chrome.

**Tech Stack:** Vue 3 (SFC), Pinia, Vitest, Playwright, CSS.

---

### Task 1: Store density mode + toggle UI

**Files:**
- Modify: `frontend/src/stores/simulatorStore.ts`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/components/PropertyDrawer.vue`
- Test: `frontend/test/app-shell.test.ts`
- Test: `frontend/test/property-drawer.test.ts`

**Step 1: Write the failing tests**

Add a store/class test in `frontend/test/app-shell.test.ts`:

```ts
it('applies phone density class from store', async () => {
  const pinia = createPinia();
  const store = useSimulatorStore(pinia);
  Object.defineProperty(window, 'innerWidth', { value: 640, configurable: true, writable: true });

  (store as unknown as { setPhoneDensityMode?: (mode: string) => void }).setPhoneDensityMode?.('compact');
  const wrapper = mount(App, { global: { plugins: [pinia] } });
  await nextTick();
  expect(wrapper.get('#app').classes()).toContain('phone-density-compact');
});
```

Add a UI test in `frontend/test/property-drawer.test.ts`:

```ts
it('shows density toggle in phone layout', () => {
  const wrapper = mount(PropertyDrawer, {
    props: {
      modelValue: true,
      layoutMode: 'phone',
      sections: [],
      values: {}
    }
  });
  expect(wrapper.find('[data-testid="density-toggle"]').exists()).toBe(true);
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts frontend/test/property-drawer.test.ts`  
Expected: FAIL (missing class + toggle).

**Step 3: Implement minimal store + toggle**

Add state + persistence in `frontend/src/stores/simulatorStore.ts`:

```ts
const phoneDensityMode = ref<'compact' | 'comfortable'>('compact');

function loadPhoneDensityPreference() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem('sim.ui.phoneDensity');
    if (raw === 'comfortable' || raw === 'compact') phoneDensityMode.value = raw;
  } catch {}
}

function persistPhoneDensityPreference() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('sim.ui.phoneDensity', phoneDensityMode.value);
  } catch {}
}

function setPhoneDensityMode(next: 'compact' | 'comfortable') {
  phoneDensityMode.value = next;
  persistPhoneDensityPreference();
}

function togglePhoneDensityMode() {
  setPhoneDensityMode(phoneDensityMode.value === 'compact' ? 'comfortable' : 'compact');
}
```

Call `loadPhoneDensityPreference()` during store init and return the new state/actions.

Wire class in `frontend/src/App.vue` root:

```ts
const phoneDensityClass = computed(() =>
  simulatorStore.phoneDensityMode === 'compact' ? 'phone-density-compact' : 'phone-density-comfortable'
);
```

```html
<div id="app" :class="{ ..., [phoneDensityClass]: true }">
```

Add a phone-only toggle button in `frontend/src/components/PropertyDrawer.vue` header:

```html
<button
  v-if="props.layoutMode === 'phone'"
  type="button"
  class="btn"
  data-testid="density-toggle"
  @click="emit('toggle-density')"
>
  {{ densityLabel }}
</button>
```

Add prop/emit for density in PropertyDrawer and pass from `App.vue` to avoid store import in component.

**Step 4: Run tests to verify they pass**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts frontend/test/property-drawer.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/stores/simulatorStore.ts frontend/src/App.vue frontend/src/components/PropertyDrawer.vue frontend/test/app-shell.test.ts frontend/test/property-drawer.test.ts
git commit -m "feat: add phone density mode toggle"
```

---

### Task 2: Quick edit group (phone only)

**Files:**
- Modify: `frontend/src/components/PropertyDrawer.vue`
- Test: `frontend/test/property-drawer.test.ts`

**Step 1: Write the failing test**

```ts
it('renders quick edit group with top fields on phone', async () => {
  const wrapper = mount(PropertyDrawer, {
    props: {
      modelValue: true,
      layoutMode: 'phone',
      sections: [{
        title: '基础',
        fields: [
          { key: 'x', label: 'X', type: 'number' },
          { key: 'y', label: 'Y', type: 'number' },
          { key: 'radius', label: '半径', type: 'number' },
          { key: 'strength', label: '场强', type: 'number' },
          { key: 'hidden', label: '隐藏', type: 'checkbox' }
        ]
      }],
      values: { x: 1, y: 2, radius: 3, strength: 4, hidden: false }
    }
  });
  expect(wrapper.find('[data-testid="property-quick-edit"]').exists()).toBe(true);
  expect(wrapper.findAll('[data-testid="quick-field"]').length).toBe(4);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/property-drawer.test.ts`  
Expected: FAIL (quick edit missing).

**Step 3: Implement minimal quick edit selection**

Add `computed` in `PropertyDrawer.vue`:

```ts
const MAX_QUICK_FIELDS = 4;
const quickFields = computed(() => {
  if (props.layoutMode !== 'phone') return [];
  const fields: SchemaField[] = [];
  for (const section of props.sections ?? []) {
    for (const field of section.fields ?? []) {
      if (!field?.key) continue;
      if (field.geometryRole === 'display') continue;
      if (field.multiline) continue;
      fields.push(field);
    }
  }
  return fields.filter(isVisible).slice(0, MAX_QUICK_FIELDS);
});
```

Render above sections:

```html
<section v-if="quickFields.length" class="property-section" data-testid="property-quick-edit">
  <div class="property-quick-title">快捷编辑</div>
  <dl class="property-rows">
    <template v-for="field in quickFields" :key="field.key">
      <dt class="property-key"><label :for="`quick-${field.key}`">{{ field.label ?? field.key }}</label></dt>
      <dd class="property-value" data-testid="quick-field"> ... </dd>
    </template>
  </dl>
</section>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- frontend/test/property-drawer.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/PropertyDrawer.vue frontend/test/property-drawer.test.ts
git commit -m "feat: add phone quick edit group"
```

---

### Task 3: Inline unit normalization and rendering

**Files:**
- Modify: `frontend/src/runtime/simulatorRuntime.ts`
- Modify: `frontend/src/components/PropertyDrawer.vue`
- Modify: `styles/main.css`
- Test: `frontend/test/simulator-runtime.test.ts`

**Step 1: Write the failing test**

Add a unit parser test in `frontend/test/simulator-runtime.test.ts`:

```ts
import { extractLabelUnit } from '../src/runtime/simulatorRuntime';

it('extracts unit suffix from labels safely', () => {
  expect(extractLabelUnit('场强 (N/C)')).toEqual({ label: '场强', unit: 'N/C' });
  expect(extractLabelUnit('重力加速度 g (m/s²)')).toEqual({ label: '重力加速度 g', unit: 'm/s²' });
  expect(extractLabelUnit('半径（质点模式忽略）')).toEqual({ label: '半径（质点模式忽略）', unit: '' });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/simulator-runtime.test.ts`  
Expected: FAIL (missing function).

**Step 3: Implement unit parsing + render**

In `frontend/src/runtime/simulatorRuntime.ts`:

```ts
export function extractLabelUnit(raw: string) {
  const label = String(raw ?? '');
  const match = label.match(/^(.*?)[\\s]*[（(]([A-Za-z°/%·0-9\\-+^]+(?:\\/[-A-Za-z0-9^]+)*)[）)]\\s*$/);
  if (!match) return { label, unit: '' };
  return { label: match[1].trim(), unit: match[2].trim() };
}
```

When mapping fields in `buildPropertySectionsForUI`, inject unit and cleaned label:

```ts
const nextLabel = String(field.label ?? field.key);
const { label, unit } = extractLabelUnit(nextLabel);
mappedFields.push({ ...field, label, unit: field.unit || unit });
```

Render unit in PropertyDrawer `dd`:

```html
<div class="property-value-inner">
  <input ... />
  <span v-if="field.unit" class="property-unit">{{ field.unit }}</span>
</div>
```

Add styles in `styles/main.css`:

```css
.property-value-inner {
  display: flex;
  align-items: center;
  gap: 6px;
}

.property-unit {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- frontend/test/simulator-runtime.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/runtime/simulatorRuntime.ts frontend/src/components/PropertyDrawer.vue styles/main.css frontend/test/simulator-runtime.test.ts
git commit -m "feat: inline property units"
```

---

### Task 4: Density styles for compact vs comfortable

**Files:**
- Modify: `styles/main.css`
- Modify: `styles/components.css`
- Test: `frontend/e2e/phone-density-visual.spec.ts`

**Step 1: Write the failing test**

Create `frontend/e2e/phone-density-visual.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('phone density visual snapshots', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173');
  await page.waitForSelector('#app.layout-phone');
  await expect(page).toHaveScreenshot('phone-density-compact.png');
  await page.evaluate(() => document.documentElement.classList.add('phone-density-comfortable'));
  await expect(page).toHaveScreenshot('phone-density-comfortable.png');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- frontend/e2e/phone-density-visual.spec.ts`  
Expected: FAIL (missing snapshots).

**Step 3: Implement density CSS**

Move current phone spacing into `.phone-density-comfortable` and add compact overrides under `.phone-density-compact`:

```css
#app.layout-phone.phone-density-comfortable { ... }
#app.layout-phone.phone-density-compact { ... }
```

Cover: bottom nav height, sheet padding, button/input heights, property rows, markdown/variables sheets.

**Step 4: Re-run to update snapshots**

Run: `npm run test:e2e -- frontend/e2e/phone-density-visual.spec.ts`  
Expected: PASS after snapshot update.

**Step 5: Commit**

```bash
git add styles/main.css styles/components.css frontend/e2e/phone-density-visual.spec.ts
git commit -m "feat: phone density compact/comfortable styles"
```

---

### Task 5: Quick edit + density integration in App

**Files:**
- Modify: `frontend/src/App.vue`
- Test: `frontend/test/app-shell.test.ts`

**Step 1: Write failing test**

```ts
it('toggles density from property drawer', async () => {
  const pinia = createPinia();
  Object.defineProperty(window, 'innerWidth', { value: 640, configurable: true, writable: true });
  const wrapper = mount(App, { global: { plugins: [pinia] } });
  await nextTick();
  await wrapper.get('#phone-nav-selected-btn').trigger('click');
  await wrapper.get('[data-testid="density-toggle"]').trigger('click');
  expect(wrapper.get('#app').classes()).toContain('phone-density-comfortable');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`  
Expected: FAIL (toggle not wired).

**Step 3: Implement wiring**

Pass density props/emit into `PropertyDrawer` and wire to store:

```html
<PropertyDrawer
  ...
  :density-mode="simulatorStore.phoneDensityMode"
  @toggle-density="simulatorStore.togglePhoneDensityMode"
/>
```

**Step 4: Run test to verify it passes**

Run: `npm run test:frontend -- frontend/test/app-shell.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/App.vue frontend/test/app-shell.test.ts
git commit -m "feat: wire phone density toggle"
```

---

Plan complete and saved to `docs/plans/2026-02-27-phone-property-density-quick-edit.md`. Two execution options:

1. Subagent-Driven (this session) – I dispatch a fresh subagent per task, review between tasks, fast iteration  
2. Parallel Session (separate) – Open new session with executing-plans, batch execution with checkpoints

Which approach?
