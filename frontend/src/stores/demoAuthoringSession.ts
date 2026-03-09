import {
  captureAuthoringDemoRestoreState,
  consumeAuthoringDemoRestoreState,
  createDemoRestoreState,
  type DemoRestoreState
} from '../session/authoringSessionTransitions';

export type DemoAuthoringRestoreState = DemoRestoreState;

export function createDemoAuthoringRestoreState(): DemoAuthoringRestoreState {
  return createDemoRestoreState();
}

export function captureDemoAuthoringRestoreState(options: {
  propertyDrawerOpen: boolean;
  selectedObjectId: string | null;
}): DemoAuthoringRestoreState {
  return captureAuthoringDemoRestoreState(
    {
      activeDrawer: null,
      drawerHistory: [],
      pendingDemoRestore: createDemoRestoreState()
    },
    options
  ).pendingDemoRestore;
}

export function consumeDemoAuthoringRestoreState(
  state: DemoAuthoringRestoreState,
  options: {
    selectedObjectId: string | null;
  }
): {
  nextState: DemoAuthoringRestoreState;
  shouldReopenPropertyDrawer: boolean;
} {
  const result = consumeAuthoringDemoRestoreState(
    {
      activeDrawer: null,
      drawerHistory: [],
      pendingDemoRestore: state
    },
    options
  );
  return {
    nextState: result.nextState.pendingDemoRestore,
    shouldReopenPropertyDrawer: result.shouldReopenPropertyDrawer
  };
}
