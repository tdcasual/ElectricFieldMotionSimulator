import type { SceneAggregateState } from '../../domain/types';

export type SceneReadModel = {
  revision: number;
  running: boolean;
  timeStep: number;
  timeStepLabel: string;
  viewport: {
    width: number;
    height: number;
  };
  objectCount: number;
  selectedObjectId: string | null;
  objects: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    radius: number;
    width: number;
    height: number;
    velocityX: number;
    velocityY: number;
    color: string;
    props: Record<string, unknown>;
  }>;
};

export function projectSceneReadModel(state: SceneAggregateState): SceneReadModel {
  const timeStep = Number.isFinite(state.timeStep) && state.timeStep > 0
    ? state.timeStep
    : 0.016;
  return {
    revision: state.revision,
    running: state.running,
    timeStep,
    timeStepLabel: `${Math.round(timeStep * 1000)}ms`,
    viewport: {
      width: state.viewport.width,
      height: state.viewport.height
    },
    objectCount: state.objects.length,
    selectedObjectId: state.selectedObjectId,
    objects: state.objects.map((item) => ({
      id: item.id,
      type: item.type,
      x: item.position.x,
      y: item.position.y,
      radius: item.radius,
      width: item.width,
      height: item.height,
      velocityX: item.velocity.x,
      velocityY: item.velocity.y,
      color: item.color,
      props: { ...item.props }
    }))
  };
}
