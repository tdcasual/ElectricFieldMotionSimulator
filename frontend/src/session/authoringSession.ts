export type AuthoringDrawer = 'property' | 'variables' | 'markdown';

export type DemoRestoreState = {
  restorePropertyDrawer: boolean;
};

export type AuthoringSessionState = {
  activeDrawer: AuthoringDrawer | null;
  drawerHistory: AuthoringDrawer[];
  pendingDemoRestore: DemoRestoreState;
};

export function createDemoRestoreState(): DemoRestoreState {
  return {
    restorePropertyDrawer: false
  };
}

export function createAuthoringSessionState(): AuthoringSessionState {
  return {
    activeDrawer: null,
    drawerHistory: [],
    pendingDemoRestore: createDemoRestoreState()
  };
}
