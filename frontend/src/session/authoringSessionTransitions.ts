import {
  createAuthoringSessionState,
  createDemoRestoreState,
  type AuthoringDrawer,
  type AuthoringSessionState,
  type DemoRestoreState
} from './authoringSession';

export {
  createAuthoringSessionState,
  createDemoRestoreState,
  type AuthoringDrawer,
  type AuthoringSessionState,
  type DemoRestoreState
};

type CloseAuthoringDrawerOptions = {
  selectedObjectId?: string | null;
  propertyDrawerSelectionId?: string | null;
};

type CaptureDemoRestoreOptions = {
  propertyDrawerOpen: boolean;
  selectedObjectId: string | null;
};

type ConsumeDemoRestoreOptions = {
  selectedObjectId: string | null;
};

export function activateAuthoringDrawer(state: AuthoringSessionState, target: AuthoringDrawer): AuthoringSessionState {
  if (state.activeDrawer === target) return state;

  const nextHistory = state.activeDrawer
    ? state.drawerHistory.filter((item) => item !== state.activeDrawer && item !== target).concat(state.activeDrawer)
    : state.drawerHistory.filter((item) => item !== target);

  return {
    ...state,
    activeDrawer: target,
    drawerHistory: nextHistory
  };
}

export function clearAuthoringSessionDrawers(state: AuthoringSessionState): AuthoringSessionState {
  if (state.activeDrawer === null && state.drawerHistory.length === 0) return state;
  return {
    ...state,
    activeDrawer: null,
    drawerHistory: []
  };
}

export function closeAuthoringDrawer(
  state: AuthoringSessionState,
  target: AuthoringDrawer,
  options: CloseAuthoringDrawerOptions = {}
): {
  nextState: AuthoringSessionState;
  restoredDrawer: AuthoringDrawer | null;
  requiresPropertyPayloadRefresh: boolean;
} {
  if (state.activeDrawer !== target) {
    return {
      nextState: state,
      restoredDrawer: null,
      requiresPropertyPayloadRefresh: false
    };
  }

  const nextHistory = [...state.drawerHistory];
  let restoredDrawer: AuthoringDrawer | null = null;
  let requiresPropertyPayloadRefresh = false;

  while (nextHistory.length > 0) {
    const candidate = nextHistory.pop() ?? null;
    if (!candidate) continue;
    if (candidate === 'property') {
      if (!options.selectedObjectId) continue;
      restoredDrawer = candidate;
      requiresPropertyPayloadRefresh = options.propertyDrawerSelectionId !== options.selectedObjectId;
      break;
    }
    restoredDrawer = candidate;
    break;
  }

  return {
    nextState: {
      ...state,
      activeDrawer: restoredDrawer,
      drawerHistory: nextHistory
    },
    restoredDrawer,
    requiresPropertyPayloadRefresh
  };
}

export function captureAuthoringDemoRestoreState(
  state: AuthoringSessionState,
  options: CaptureDemoRestoreOptions
): AuthoringSessionState {
  return {
    ...state,
    pendingDemoRestore: {
      restorePropertyDrawer: !!options.propertyDrawerOpen && !!options.selectedObjectId
    }
  };
}

export function consumeAuthoringDemoRestoreState(
  state: AuthoringSessionState,
  options: ConsumeDemoRestoreOptions
): {
  nextState: AuthoringSessionState;
  shouldReopenPropertyDrawer: boolean;
} {
  const shouldReopenPropertyDrawer = !!state.pendingDemoRestore.restorePropertyDrawer && !!options.selectedObjectId;
  return {
    nextState: {
      ...state,
      pendingDemoRestore: createDemoRestoreState()
    },
    shouldReopenPropertyDrawer
  };
}
