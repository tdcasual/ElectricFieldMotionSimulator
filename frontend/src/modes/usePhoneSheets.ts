import { computed, ref, watch } from 'vue';
import type { LayoutMode } from '../stores/simulatorStore';

type PhoneSheetKey = 'add' | 'selected' | 'scene' | 'more' | null;

type PhoneSheetStore = {
  viewMode: boolean;
  layoutMode: LayoutMode;
  selectedObjectId: string | null;
  refreshSelectedPropertyPayload: () => unknown;
};

export function usePhoneSheets(store: PhoneSheetStore) {
  const phoneActiveSheet = ref<PhoneSheetKey>(null);
  const showAuthoringControls = computed(() => !store.viewMode);
  const isPhoneLayout = computed(() => store.layoutMode === 'phone');
  const phoneAddSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && phoneActiveSheet.value === 'add'
  );
  const phoneSelectedSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && phoneActiveSheet.value === 'selected'
  );
  const phoneSceneSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && phoneActiveSheet.value === 'scene'
  );
  const phoneMoreSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && phoneActiveSheet.value === 'more'
  );
  const phoneAnySheetOpen = computed(
    () =>
      phoneAddSheetOpen.value ||
      phoneSelectedSheetOpen.value ||
      phoneSceneSheetOpen.value ||
      phoneMoreSheetOpen.value
  );

  function closePhoneSheets() {
    phoneActiveSheet.value = null;
  }

  function setPhoneActiveSheet(next: PhoneSheetKey) {
    if (!isPhoneLayout.value) return;
    if (next === 'selected' && !store.selectedObjectId) {
      phoneActiveSheet.value = null;
      return;
    }
    if (next === 'selected') {
      store.refreshSelectedPropertyPayload();
    }
    phoneActiveSheet.value = next;
  }

  watch(
    () => store.layoutMode,
    (next) => {
      if (next !== 'phone') {
        phoneActiveSheet.value = null;
      }
    }
  );

  watch(
    () => showAuthoringControls.value,
    (visible) => {
      if (visible) return;
      phoneActiveSheet.value = null;
    }
  );

  watch(
    () => store.selectedObjectId,
    (selectedId) => {
      if (!selectedId) {
        if (phoneActiveSheet.value === 'selected') {
          phoneActiveSheet.value = null;
        }
        return;
      }
      if (phoneSelectedSheetOpen.value) {
        store.refreshSelectedPropertyPayload();
      }
    }
  );

  watch(
    () => phoneSelectedSheetOpen.value,
    (open) => {
      if (!open) return;
      if (!store.selectedObjectId) return;
      store.refreshSelectedPropertyPayload();
    }
  );

  return {
    phoneActiveSheet,
    showAuthoringControls,
    isPhoneLayout,
    phoneAddSheetOpen,
    phoneSelectedSheetOpen,
    phoneSceneSheetOpen,
    phoneMoreSheetOpen,
    phoneAnySheetOpen,
    closePhoneSheets,
    setPhoneActiveSheet
  };
}
