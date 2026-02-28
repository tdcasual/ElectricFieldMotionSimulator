import { describe, it, expect, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import App from '../src/App.vue';
import { useSimulatorStore } from '../src/stores/simulatorStore';

function dispatchPointerEvent(
  target: Element,
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  options: { x?: number; y?: number; pointerType?: string } = {}
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: options.x ?? 0 });
  Object.defineProperty(event, 'clientY', { value: options.y ?? 0 });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType ?? 'touch' });
  target.dispatchEvent(event);
}

describe('App shell', () => {
  it('renders vue-native simulator layout root', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    expect(wrapper.find('#app[data-testid="app-shell"]').exists()).toBe(true);
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
    expect(wrapper.find('#toolbar').exists()).toBe(true);
    expect(wrapper.find('#particle-canvas').exists()).toBe(true);
    expect(wrapper.find('#property-panel').exists()).toBe(true);
  });

  it('toggles demo mode button state on click', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    const demoBtn = wrapper.get('#demo-mode-btn');
    expect(demoBtn.attributes('aria-pressed')).toBe('false');
    expect(demoBtn.text()).toContain('演示模式');

    await demoBtn.trigger('click');
    await nextTick();

    expect(demoBtn.attributes('aria-pressed')).toBe('true');
    expect(demoBtn.text()).toContain('退出演示');
  });

  it('toggles play state label on click', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    const playBtn = wrapper.get('#play-pause-btn');
    expect(wrapper.get('#play-label').text()).toBe('播放');

    await playBtn.trigger('click');
    await nextTick();
    expect(wrapper.get('#play-label').text()).toBe('暂停');

    await playBtn.trigger('click');
    await nextTick();
    expect(wrapper.get('#play-label').text()).toBe('播放');
  });

  it('creates object from toolbar double click and updates footer count', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });
    expect(wrapper.get('#object-count').text()).toContain('对象: 0');

    await wrapper.get('#toolbar .tool-item[data-type="particle"]').trigger('dblclick');
    await nextTick();

    expect(wrapper.get('#object-count').text()).toContain('对象: 1');
  });

  it('opens markdown board from header button', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    const markdownBtn = wrapper.get('#markdown-toggle-btn');
    expect(markdownBtn.attributes('disabled')).toBeUndefined();
    expect(markdownBtn.attributes('aria-pressed')).toBe('false');

    await markdownBtn.trigger('click');
    await nextTick();

    expect(markdownBtn.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="markdown-board"]').isVisible()).toBe(true);
  });

  it('opens variables panel from header button', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()]
      }
    });

    const variablesBtn = wrapper.get('#variables-btn');
    expect(variablesBtn.attributes('disabled')).toBeUndefined();
    expect(variablesBtn.attributes('aria-pressed')).toBe('false');

    await variablesBtn.trigger('click');
    await nextTick();

    expect(variablesBtn.attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="variables-panel"]').isVisible()).toBe(true);
  });

  it('hides authoring controls in view mode', () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    store.setHostMode('view');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    expect(wrapper.find('#toolbar').exists()).toBe(false);
    expect(wrapper.find('#save-btn').exists()).toBe(false);
    expect(wrapper.find('#import-btn').exists()).toBe(false);
    expect(wrapper.find('#play-pause-btn').exists()).toBe(true);
  });

  it('applies phone layout class from store mode', () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    (store as unknown as { setLayoutMode?: (mode: string) => void }).setLayoutMode?.('phone');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    expect(wrapper.get('#app').classes()).toContain('layout-phone');
  });

  it('applies phone density class from store', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    (store as unknown as { setPhoneDensityMode?: (mode: string) => void }).setPhoneDensityMode?.('compact');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.get('#app').classes()).toContain('phone-density-compact');
  });

  it('toggles phone density class from property panel button', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    store.openPropertyPanel();
    await nextTick();

    const appShell = wrapper.get('#app');
    expect(appShell.classes()).toContain('phone-density-compact');

    await wrapper.get('[data-testid="density-toggle"]').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-density-comfortable');
  });

  it('toggles classroom mode class from header action button', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 1366,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    expect(appShell.classes()).not.toContain('classroom-mode');

    const btn = wrapper.get('#classroom-mode-btn');
    expect(btn.attributes('aria-pressed')).toBe('false');
    await btn.trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('classroom-mode');
    expect(btn.attributes('aria-pressed')).toBe('true');
  });

  it('syncs layout mode from viewport width on mount and resize', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);

    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(store.layoutMode).toBe('phone');
    expect(wrapper.get('#app').classes()).toContain('layout-phone');

    window.innerWidth = 900;
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(store.layoutMode).toBe('tablet');
    expect(wrapper.get('#app').classes()).toContain('layout-tablet');

    window.innerWidth = 1366;
    window.dispatchEvent(new Event('resize'));
    await nextTick();
    expect(store.layoutMode).toBe('desktop');
    expect(wrapper.get('#app').classes()).toContain('layout-desktop');
  });

  it('shows object action bar in phone mode when an object is selected', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('[data-testid="object-action-bar"]').exists()).toBe(true);
  });

  it('shows geometry overlay badge only while geometry interaction payload is active on phone', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { setLayoutMode?: (mode: string) => void }).setLayoutMode?.('phone');
    (store as unknown as {
      geometryInteraction: {
        objectId: string | null;
        sourceKey: string;
        realValue: number;
        displayValue: number;
        objectScale: number;
      } | null;
    }).geometryInteraction = {
      objectId: 'obj-geo-1',
      sourceKey: 'radius',
      realValue: 1.25,
      displayValue: 82,
      objectScale: 1.64
    };

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('[data-testid="geometry-overlay-badge"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="geometry-overlay-real"]').text()).toBe('1.25');
    expect(wrapper.get('[data-testid="geometry-overlay-display"]').text()).toBe('82');
    expect(wrapper.get('[data-testid="geometry-overlay-scale"]').text()).toBe('1.64');

    (store as unknown as { geometryInteraction: null }).geometryInteraction = null;
    await nextTick();
    expect(wrapper.find('[data-testid="geometry-overlay-badge"]').exists()).toBe(false);
  });

  it('does not render geometry overlay badge on desktop layout', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 1366,
      configurable: true,
      writable: true
    });
    (store as unknown as {
      geometryInteraction: {
        objectId: string | null;
        sourceKey: string;
        realValue: number;
        displayValue: number;
        objectScale: number;
      } | null;
    }).geometryInteraction = {
      objectId: 'obj-geo-2',
      sourceKey: 'width',
      realValue: 2,
      displayValue: 120,
      objectScale: 1.2
    };

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('[data-testid="geometry-overlay-badge"]').exists()).toBe(false);
  });

  it('toggles phone scene sheet from bottom nav and closes via backdrop', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    expect(appShell.classes()).not.toContain('phone-settings-open');

    await wrapper.get('#phone-nav-scene-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-settings-open');
    expect(wrapper.find('[data-testid="phone-scene-sheet"]').exists()).toBe(true);

    await wrapper.get('.phone-sheet-backdrop').trigger('click');
    await nextTick();
    expect(appShell.classes()).not.toContain('phone-settings-open');
  });

  it('keeps phone add and scene sheets mutually exclusive', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-add-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-toolbar-open');

    await wrapper.get('#phone-nav-scene-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).not.toContain('phone-toolbar-open');
    expect(appShell.classes()).toContain('phone-settings-open');
  });

  it('uses phone more sheet for import/export/theme', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('#export-btn').exists()).toBe(false);
    expect(wrapper.find('#import-btn').exists()).toBe(false);
    expect(wrapper.find('#theme-toggle-btn').exists()).toBe(false);
    expect(wrapper.find('#phone-nav-more-btn').exists()).toBe(true);
  });

  it('opens phone more sheet and triggers export', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const exportSpy = vi.spyOn(store, 'exportScene');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-export-btn').trigger('click');
    await nextTick();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(appShell.classes()).not.toContain('phone-secondary-open');
  });

  it('keeps phone more sheet open when clear scene is cancelled', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const clearSpy = vi.spyOn(store, 'clearScene');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-clear-btn').trigger('click');
    await nextTick();

    expect(clearSpy).toHaveBeenCalledTimes(0);
    expect(appShell.classes()).toContain('phone-secondary-open');
    confirmSpy.mockRestore();
  });

  it('keeps phone more sheet open when save scene is cancelled', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const saveSpy = vi.spyOn(store, 'saveScene');
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-save-btn').trigger('click');
    await nextTick();

    expect(saveSpy).toHaveBeenCalledTimes(0);
    expect(appShell.classes()).toContain('phone-secondary-open');
    promptSpy.mockRestore();
  });

  it('keeps phone more sheet open when save scene fails', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const saveSpy = vi.spyOn(store, 'saveScene').mockReturnValue(false);
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('   ');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-save-btn').trigger('click');
    await nextTick();

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(appShell.classes()).toContain('phone-secondary-open');
    promptSpy.mockRestore();
  });

  it('keeps phone more sheet open when load scene is cancelled', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const loadSpy = vi.spyOn(store, 'loadScene');
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-load-btn').trigger('click');
    await nextTick();

    expect(loadSpy).toHaveBeenCalledTimes(0);
    expect(appShell.classes()).toContain('phone-secondary-open');
    promptSpy.mockRestore();
  });

  it('keeps phone more sheet open when load scene fails', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    const loadSpy = vi.spyOn(store, 'loadScene').mockReturnValue(false);
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('unknown');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-secondary-open');

    await wrapper.get('#secondary-load-btn').trigger('click');
    await nextTick();

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(appShell.classes()).toContain('phone-secondary-open');
    promptSpy.mockRestore();
  });

  it('forwards action-bar duplicate and delete events to store actions', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    const duplicateSpy = vi.spyOn(store, 'duplicateSelected');
    const deleteSpy = vi.spyOn(store, 'deleteSelected');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    await wrapper.get('[data-testid="action-duplicate"]').trigger('click');
    await wrapper.get('[data-testid="action-delete"]').trigger('click');

    expect(duplicateSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });

  it('renders phone bottom navigation and toggles add sheet', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('#phone-bottom-nav').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-add-sheet"]').exists()).toBe(false);

    await wrapper.get('#phone-nav-add-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-add-sheet"]').exists()).toBe(true);

    await wrapper.get('#phone-nav-add-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-add-sheet"]').exists()).toBe(false);
  });

  it('creates object from phone add sheet tool tap and closes sheet', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.get('#object-count').text()).toContain('对象: 0');

    await wrapper.get('#phone-nav-add-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-add-sheet"]').exists()).toBe(true);

    await wrapper.get('[data-testid="phone-add-sheet"] .tool-item[data-type="particle"]').trigger('click');
    await nextTick();

    expect(wrapper.get('#object-count').text()).toContain('对象: 1');
    expect(wrapper.find('[data-testid="phone-add-sheet"]').exists()).toBe(false);
  });

  it('disables selected sheet entry when no object is selected and enables after selection', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.get('#phone-nav-selected-btn').attributes('disabled')).toBeDefined();

    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    await nextTick();
    expect(wrapper.get('#phone-nav-selected-btn').attributes('disabled')).toBeUndefined();

    await wrapper.get('#phone-nav-selected-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-selected-sheet"]').exists()).toBe(true);
  });

  it('supports direct real/display editing in phone selected sheet', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    (store as unknown as { propertySections: unknown }).propertySections = [
      {
        title: '磁场属性',
        fields: [
          { key: 'radius', label: '半径（真实）', type: 'number', sourceKey: 'radius', geometryRole: 'real' },
          { key: 'radius__display', label: '半径（显示）', type: 'number', sourceKey: 'radius', geometryRole: 'display' }
        ]
      }
    ];
    (store as unknown as { propertyValues: Record<string, unknown> }).propertyValues = {
      radius: 1,
      radius__display: 50,
      __geometryObjectScale: 1
    };
    const applySpy = vi.spyOn(store, 'applyPropertyValues');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    await wrapper.get('#phone-nav-selected-btn').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="phone-selected-sheet"]').exists()).toBe(true);
    expect(wrapper.get('#phone-selected-scale-value').text()).toContain('1');

    const realInput = wrapper.get('#phone-selected-radius-real');
    await realInput.setValue('2');
    await realInput.trigger('change');

    const displayInput = wrapper.get('#phone-selected-radius-display');
    await displayInput.setValue('120');
    await displayInput.trigger('change');

    expect(applySpy).toHaveBeenCalledWith({ radius: '2' });
    expect(applySpy).toHaveBeenCalledWith({ radius__display: '120' });
  });

  it('keeps phone bottom nav visible while locking sheet buttons when property drawer is open', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { activeDrawer: 'property' | null }).activeDrawer = 'property';

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('#phone-bottom-nav').exists()).toBe(true);
    expect(wrapper.get('#phone-nav-add-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#phone-nav-scene-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#phone-nav-more-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#phone-nav-play-btn').attributes('disabled')).toBeUndefined();
  });

  it('requires confirmation before deleting from phone action bar', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';
    const deleteSpy = vi.spyOn(store, 'deleteSelected');

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const confirmSpy = vi.spyOn(window, 'confirm');

    confirmSpy.mockReturnValueOnce(false);
    await wrapper.get('[data-testid="action-delete"]').trigger('click');
    expect(deleteSpy).toHaveBeenCalledTimes(0);

    confirmSpy.mockReturnValueOnce(true);
    await wrapper.get('[data-testid="action-delete"]').trigger('click');
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('hides phone action bar while any phone sheet is open', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });
    (store as unknown as { selectedObjectId: string | null }).selectedObjectId = 'obj-1';

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    expect(wrapper.find('[data-testid="object-action-bar"]').exists()).toBe(true);

    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-more-sheet"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="object-action-bar"]').exists()).toBe(false);

    await wrapper.get('#phone-nav-more-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-more-sheet"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="object-action-bar"]').exists()).toBe(true);
  });

  it('closes open phone sheet when play is toggled from phone bottom nav', async () => {
    const pinia = createPinia();
    const store = useSimulatorStore(pinia);
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    const appShell = wrapper.get('#app');
    expect(store.running).toBe(false);

    await wrapper.get('#phone-nav-scene-btn').trigger('click');
    await nextTick();
    expect(appShell.classes()).toContain('phone-settings-open');

    await wrapper.get('#phone-nav-play-btn').trigger('click');
    await nextTick();
    expect(store.running).toBe(true);
    expect(appShell.classes()).not.toContain('phone-settings-open');
  });

  it('supports swipe-down close gesture on phone scene sheet header', async () => {
    const pinia = createPinia();
    Object.defineProperty(window, 'innerWidth', {
      value: 640,
      configurable: true,
      writable: true
    });

    const wrapper = mount(App, {
      global: {
        plugins: [pinia]
      }
    });

    await nextTick();
    await wrapper.get('#phone-nav-scene-btn').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="phone-scene-sheet"]').exists()).toBe(true);

    const header = wrapper.get('[data-testid="phone-scene-sheet"] .phone-sheet-header').element;
    dispatchPointerEvent(header, 'pointerdown', { x: 100, y: 120, pointerType: 'touch' });
    dispatchPointerEvent(header, 'pointerup', { x: 102, y: 220, pointerType: 'touch' });
    await nextTick();

    expect(wrapper.find('[data-testid="phone-scene-sheet"]').exists()).toBe(false);
  });
});
