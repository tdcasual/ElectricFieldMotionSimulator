export type AddObjectCommand = {
  type: 'addObject';
  payload: {
    objectType: string;
    position?: { x: number; y: number };
  };
};

export type UpdateObjectPropsCommand = {
  type: 'updateObjectProps';
  payload: {
    id: string;
    patch: Record<string, unknown>;
  };
};

export type ToggleDemoModeCommand = {
  type: 'toggleDemoMode';
  payload?: {
    saveBeforeSwitch?: boolean;
  };
};

export type EngineCommand = AddObjectCommand | UpdateObjectPropsCommand | ToggleDemoModeCommand;
