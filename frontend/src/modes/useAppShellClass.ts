import { computed, type Ref } from 'vue';

type LayoutMode = 'desktop' | 'tablet' | 'phone';

type AppShellStore = {
  propertyDrawerOpen: boolean;
  viewMode: boolean;
  layoutMode: LayoutMode;
  classroomMode: boolean;
};

type UseAppShellClassOptions = {
  simulatorStore: AppShellStore;
  phoneAddSheetOpen: Ref<boolean>;
  phoneSceneSheetOpen: Ref<boolean>;
  phoneMoreSheetOpen: Ref<boolean>;
  phoneSelectedSheetOpen: Ref<boolean>;
  phoneDensityClass: Ref<string>;
};

export function useAppShellClass(options: UseAppShellClassOptions) {
  const { simulatorStore, phoneAddSheetOpen, phoneSceneSheetOpen, phoneMoreSheetOpen, phoneSelectedSheetOpen, phoneDensityClass } = options;

  const appShellClass = computed(() => ({
    'panel-open': simulatorStore.propertyDrawerOpen,
    'view-mode': simulatorStore.viewMode,
    'layout-desktop': simulatorStore.layoutMode === 'desktop',
    'layout-tablet': simulatorStore.layoutMode === 'tablet',
    'layout-phone': simulatorStore.layoutMode === 'phone',
    'classroom-mode': simulatorStore.classroomMode,
    'phone-toolbar-open': phoneAddSheetOpen.value,
    'phone-settings-open': phoneSceneSheetOpen.value,
    'phone-secondary-open': phoneMoreSheetOpen.value,
    'phone-selected-open': phoneSelectedSheetOpen.value,
    [phoneDensityClass.value]: true
  }));

  return {
    appShellClass
  };
}
