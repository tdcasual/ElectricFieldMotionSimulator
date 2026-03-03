export type SceneVersion = '3.0';

export type SceneObjectType = 'particle' | 'electric-field' | 'magnetic-field';

export type ScenePosition = {
  x: number;
  y: number;
};

export type SceneVelocity = {
  x: number;
  y: number;
};

export type SceneViewport = {
  width: number;
  height: number;
};

export type SceneObjectRecord = {
  id: string;
  type: SceneObjectType;
  position: ScenePosition;
  velocity: SceneVelocity;
  radius: number;
  width: number;
  height: number;
  color: string;
  props: Record<string, unknown>;
};

export type SceneAggregateState = {
  version: SceneVersion;
  revision: number;
  running: boolean;
  timeStep: number;
  viewport: SceneViewport;
  selectedObjectId: string | null;
  objects: SceneObjectRecord[];
};
