import type { SceneAggregateState } from '../../domain/types';

export type SceneReadModel = {
  revision: number;
  running: boolean;
  timeStep: number;
  timeStepLabel: string;
  objectCount: number;
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
    objectCount: state.objects.length
  };
}

