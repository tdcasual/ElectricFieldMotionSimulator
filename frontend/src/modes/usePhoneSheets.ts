import { computed, ref, watch } from 'vue';
import { applyPhoneSelectionChange, applyPhoneSheetActivation, createPhoneSheetSessionState, resetPhoneSheetSessionState, type PhoneSheetKey } from './phoneSheetStateMachine';
import type { LayoutMode } from '../stores/simulatorStore';

type PhoneSheetStore = {
  viewMode: boolean;
  layoutMode: LayoutMode;
  selectedObjectId: string | null;
  demoMode?: boolean;
  activeDrawer?: string | null;
  refreshSelectedPropertyPayload: () => unknown;
};

export function usePhoneSheets(store: PhoneSheetStore) {
  const sessionState = ref(createPhoneSheetSessionState());
  const showAuthoringControls = computed(() => !store.viewMode);
  const isPhoneLayout = computed(() => store.layoutMode === 'phone');
  const phoneSheetsSuspended = computed(() => store.activeDrawer !== null && store.activeDrawer !== undefined);
  const phoneActiveSheet = computed(() => sessionState.value.activeSheet);
  const phoneAddSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && !phoneSheetsSuspended.value && phoneActiveSheet.value === 'add'
  );
  const phoneSelectedSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && !phoneSheetsSuspended.value && phoneActiveSheet.value === 'selected'
  );
  const phoneSceneSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && !phoneSheetsSuspended.value && phoneActiveSheet.value === 'scene'
  );
  const phoneMoreSheetOpen = computed(
    () => showAuthoringControls.value && isPhoneLayout.value && !phoneSheetsSuspended.value && phoneActiveSheet.value === 'more'
  );
  const phoneAnySheetOpen = computed(
    () =>
      phoneAddSheetOpen.value ||
      phoneSelectedSheetOpen.value ||
      phoneSceneSheetOpen.value ||
      phoneMoreSheetOpen.value
  );

  function closePhoneSheets() {
    sessionState.value = resetPhoneSheetSessionState(sessionState.value);
  }

  function setPhoneActiveSheet(next: PhoneSheetKey) {
    const canOpenSelectedSheet =
      next !== 'selected' || (!!store.selectedObjectId && store.refreshSelectedPropertyPayload() !== false);
    sessionState.value = applyPhoneSheetActivation(sessionState.value, {
      nextSheet: next,
      isPhoneLayout: isPhoneLayout.value,
      hasSelection: !!store.selectedObjectId,
      canOpenSelectedSheet
    });
  }

  watch(
    () => store.layoutMode,
    (next) => {
      if (next !== 'phone') {
        sessionState.value = resetPhoneSheetSessionState(sessionState.value);
      }
    }
  );

  watch(
    () => showAuthoringControls.value,
    (visible) => {
      if (visible) return;
      sessionState.value = resetPhoneSheetSessionState(sessionState.value);
    }
  );

  watch(
    () => store.selectedObjectId,
    (selectedId) => {
      const previousActiveSheet = sessionState.value.activeSheet;
      sessionState.value = applyPhoneSelectionChange(sessionState.value, {
        hasSelection: !!selectedId,
        demoMode: !!store.demoMode,
        canRestoreSelectedSheet: true
      });
      if (previousActiveSheet === 'selected' && phoneSelectedSheetOpen.value) {
        const refreshed = store.refreshSelectedPropertyPayload();
        if (refreshed === false) {
          sessionState.value = resetPhoneSheetSessionState(sessionState.value);
        }
      }
    }
  );

  watch(
    () => phoneSelectedSheetOpen.value,
    (open) => {
      if (!open) return;
      if (!store.selectedObjectId) return;
      const refreshed = store.refreshSelectedPropertyPayload();
      if (refreshed === false) {
        sessionState.value = resetPhoneSheetSessionState(sessionState.value);
      }
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
