export type SceneVersion = '3.0';

export type ScenePosition = {
  x: number;
  y: number;
};

export type SceneObjectRecord = {
  id: string;
  type: string;
  position: ScenePosition;
  props: Record<string, unknown>;
};

export type SceneAggregateState = {
  version: SceneVersion;
  revision: number;
  running: boolean;
  timeStep: number;
  objects: SceneObjectRecord[];
};

