import { nextTick, reactive } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { usePhoneSheets } from '../src/modes/usePhoneSheets';

describe('usePhoneSheets', () => {
  it('blocks selected sheet when nothing is selected', () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: null as string | null,
      refreshSelectedPropertyPayload: vi.fn()
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('selected');
    expect(sheets.phoneActiveSheet.value).toBeNull();
  });

  it('closes active sheet when layout leaves phone mode', async () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: 'obj-1' as string | null,
      refreshSelectedPropertyPayload: vi.fn()
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('scene');
    expect(sheets.phoneActiveSheet.value).toBe('scene');

    store.layoutMode = 'desktop';
    await nextTick();
    expect(sheets.phoneActiveSheet.value).toBeNull();
  });

  it('closes selected sheet when selection is cleared', async () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: 'obj-1' as string | null,
      refreshSelectedPropertyPayload: vi.fn()
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('selected');
    expect(sheets.phoneSelectedSheetOpen.value).toBe(true);

    store.selectedObjectId = null;
    await nextTick();
    expect(sheets.phoneActiveSheet.value).toBeNull();
  });

  it('transitions add sheet into selected sheet when a new selection appears', async () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: null as string | null,
      refreshSelectedPropertyPayload: vi.fn()
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('add');
    expect(sheets.phoneAddSheetOpen.value).toBe(true);

    store.selectedObjectId = 'obj-2';
    await nextTick();

    expect(store.refreshSelectedPropertyPayload).toHaveBeenCalledTimes(1);
    expect(sheets.phoneActiveSheet.value).toBe('selected');
    expect(sheets.phoneSelectedSheetOpen.value).toBe(true);
  });

  it('restores selected sheet after demo mode temporarily clears selection', async () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: 'obj-1' as string | null,
      activeDrawer: null as string | null,
      demoMode: false,
      refreshSelectedPropertyPayload: vi.fn()
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('selected');
    expect(sheets.phoneSelectedSheetOpen.value).toBe(true);

    store.demoMode = true;
    store.selectedObjectId = null;
    await nextTick();
    expect(sheets.phoneActiveSheet.value).toBeNull();

    store.demoMode = false;
    store.selectedObjectId = 'obj-1';
    await nextTick();

    expect(sheets.phoneActiveSheet.value).toBe('selected');
    expect(sheets.phoneSelectedSheetOpen.value).toBe(true);
  });

  it('does not open selected sheet when payload refresh fails', () => {
    const store = reactive({
      viewMode: false,
      layoutMode: 'phone' as 'phone' | 'tablet' | 'desktop',
      selectedObjectId: 'obj-1' as string | null,
      refreshSelectedPropertyPayload: vi.fn().mockReturnValue(false)
    });

    const sheets = usePhoneSheets(store);
    sheets.setPhoneActiveSheet('selected');

    expect(store.refreshSelectedPropertyPayload).toHaveBeenCalledTimes(1);
    expect(sheets.phoneActiveSheet.value).toBeNull();
    expect(sheets.phoneSelectedSheetOpen.value).toBe(false);
  });
});
