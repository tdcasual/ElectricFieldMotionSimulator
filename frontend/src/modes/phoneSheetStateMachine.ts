export type PhoneSheetKey = 'add' | 'selected' | 'scene' | 'more' | null;
export type PendingPhoneSheetRestore = Extract<PhoneSheetKey, 'selected'> | null;

export type PhoneSheetSessionState = {
  activeSheet: PhoneSheetKey;
  pendingRestoreSheet: PendingPhoneSheetRestore;
};

type ApplyPhoneSheetActivationOptions = {
  nextSheet: PhoneSheetKey;
  isPhoneLayout: boolean;
  hasSelection: boolean;
  canOpenSelectedSheet: boolean;
};

type ApplyPhoneSelectionChangeOptions = {
  hasSelection: boolean;
  demoMode: boolean;
  canRestoreSelectedSheet: boolean;
};

export function createPhoneSheetSessionState(activeSheet: PhoneSheetKey = null): PhoneSheetSessionState {
  return {
    activeSheet,
    pendingRestoreSheet: null
  };
}

export function resetPhoneSheetSessionState(_state?: PhoneSheetSessionState): PhoneSheetSessionState {
  return createPhoneSheetSessionState();
}

export function applyPhoneSheetActivation(
  _state: PhoneSheetSessionState,
  options: ApplyPhoneSheetActivationOptions
): PhoneSheetSessionState {
  if (!options.isPhoneLayout) return createPhoneSheetSessionState();
  if (options.nextSheet === 'selected' && (!options.hasSelection || !options.canOpenSelectedSheet)) {
    return createPhoneSheetSessionState();
  }
  return {
    activeSheet: options.nextSheet,
    pendingRestoreSheet: null
  };
}

export function applyPhoneSelectionChange(
  state: PhoneSheetSessionState,
  options: ApplyPhoneSelectionChangeOptions
): PhoneSheetSessionState {
  if (!options.hasSelection) {
    if (state.activeSheet !== 'selected') return state;
    return {
      activeSheet: null,
      pendingRestoreSheet: options.demoMode ? 'selected' : null
    };
  }

  if (state.pendingRestoreSheet === 'selected') {
    if (!options.canRestoreSelectedSheet) {
      return createPhoneSheetSessionState();
    }
    return {
      activeSheet: 'selected',
      pendingRestoreSheet: null
    };
  }

  if (state.activeSheet === 'add') {
    return {
      activeSheet: 'selected',
      pendingRestoreSheet: null
    };
  }

  return state;
}
