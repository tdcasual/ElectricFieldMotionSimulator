export type DemoAuthoringRestoreState = {
  restorePropertyDrawer: boolean;
};

type CaptureDemoAuthoringRestoreOptions = {
  propertyDrawerOpen: boolean;
  selectedObjectId: string | null;
};

type ConsumeDemoAuthoringRestoreOptions = {
  selectedObjectId: string | null;
};

export function createDemoAuthoringRestoreState(): DemoAuthoringRestoreState {
  return {
    restorePropertyDrawer: false
  };
}

export function captureDemoAuthoringRestoreState(
  options: CaptureDemoAuthoringRestoreOptions
): DemoAuthoringRestoreState {
  return {
    restorePropertyDrawer: !!options.propertyDrawerOpen && !!options.selectedObjectId
  };
}

export function consumeDemoAuthoringRestoreState(
  state: DemoAuthoringRestoreState,
  options: ConsumeDemoAuthoringRestoreOptions
): {
  nextState: DemoAuthoringRestoreState;
  shouldReopenPropertyDrawer: boolean;
} {
  const shouldReopenPropertyDrawer = !!state.restorePropertyDrawer && !!options.selectedObjectId;
  return {
    nextState: createDemoAuthoringRestoreState(),
    shouldReopenPropertyDrawer
  };
}
