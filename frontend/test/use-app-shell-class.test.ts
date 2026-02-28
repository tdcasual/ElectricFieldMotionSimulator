import { reactive, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useAppShellClass } from '../src/modes/useAppShellClass';

describe('useAppShellClass', () => {
  it('maps store and sheet state into app shell class flags', () => {
    const simulatorStore = reactive({
      propertyDrawerOpen: false,
      viewMode: false,
      layoutMode: 'desktop' as 'desktop' | 'tablet' | 'phone',
      classroomMode: false
    });

    const phoneAddSheetOpen = ref(false);
    const phoneSceneSheetOpen = ref(false);
    const phoneMoreSheetOpen = ref(false);
    const phoneSelectedSheetOpen = ref(false);
    const phoneDensityClass = ref('phone-density-compact');

    const { appShellClass } = useAppShellClass({
      simulatorStore,
      phoneAddSheetOpen,
      phoneSceneSheetOpen,
      phoneMoreSheetOpen,
      phoneSelectedSheetOpen,
      phoneDensityClass
    });

    expect(appShellClass.value['layout-desktop']).toBe(true);
    expect(appShellClass.value['phone-density-compact']).toBe(true);

    simulatorStore.layoutMode = 'phone';
    simulatorStore.propertyDrawerOpen = true;
    simulatorStore.classroomMode = true;
    phoneAddSheetOpen.value = true;
    phoneSceneSheetOpen.value = true;
    phoneMoreSheetOpen.value = true;
    phoneSelectedSheetOpen.value = true;
    phoneDensityClass.value = 'phone-density-comfortable';

    expect(appShellClass.value['layout-phone']).toBe(true);
    expect(appShellClass.value['panel-open']).toBe(true);
    expect(appShellClass.value['classroom-mode']).toBe(true);
    expect(appShellClass.value['phone-toolbar-open']).toBe(true);
    expect(appShellClass.value['phone-settings-open']).toBe(true);
    expect(appShellClass.value['phone-secondary-open']).toBe(true);
    expect(appShellClass.value['phone-selected-open']).toBe(true);
    expect(appShellClass.value['phone-density-comfortable']).toBe(true);
  });
});
