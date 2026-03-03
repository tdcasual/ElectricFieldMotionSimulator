import type { CommandExecutionResult } from '../types';
import { createTransactionalCommandBus } from '../commandBus';
import {
  applyCreateObject,
  applySetObjectProps,
  applySetTimeStep,
  applyToggleRunning,
  createInitialSceneAggregate
} from '../../domain/sceneAggregate';
import type { SceneAggregateState } from '../../domain/types';
import {
  projectSceneReadModel,
  type SceneReadModel
} from '../readModel/projectSceneReadModel';

type RenderAdapter = {
  publish: (snapshot: SceneReadModel) => void;
};

type CreateObjectPayload = {
  type: string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
};

type SetObjectPropsPayload = {
  id: string;
  props: Record<string, unknown>;
};

type CreateV3SimulatorApplicationOptions = {
  initialState?: SceneAggregateState;
  renderAdapter?: RenderAdapter;
};

function cloneWithFallback<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createV3SimulatorApplication(
  options: CreateV3SimulatorApplicationOptions = {}
) {
  let state = cloneWithFallback(options.initialState ?? createInitialSceneAggregate());
  const renderAdapter = options.renderAdapter ?? null;
  const bus = createTransactionalCommandBus<SceneAggregateState>({
    getState: () => state,
    setState: (next) => {
      state = next;
    }
  });

  bus.register('create_object', (current, payload: CreateObjectPayload) =>
    applyCreateObject(current, payload)
  );
  bus.register('set_object_props', (current, payload: SetObjectPropsPayload) =>
    applySetObjectProps(current, payload)
  );
  bus.register('toggle_running', (current) => applyToggleRunning(current));
  bus.register('set_time_step', (current, payload: { value: number }) =>
    applySetTimeStep(current, payload.value)
  );

  function publishReadModel() {
    if (!renderAdapter) return;
    renderAdapter.publish(projectSceneReadModel(state));
  }

  function runCommand<P>(
    type: string,
    payload: P,
    expectedRevision?: number
  ): CommandExecutionResult<SceneAggregateState> {
    const result = bus.execute({
      type,
      payload,
      expectedRevision
    });
    if (result.ok) {
      publishReadModel();
    }
    return result;
  }

  function getState() {
    return cloneWithFallback(state);
  }

  function getReadModel() {
    return projectSceneReadModel(state);
  }

  function createObjectAt(
    payload: CreateObjectPayload,
    expectedRevision?: number
  ) {
    return runCommand('create_object', payload, expectedRevision);
  }

  function setObjectProps(
    payload: SetObjectPropsPayload,
    expectedRevision?: number
  ) {
    return runCommand('set_object_props', payload, expectedRevision);
  }

  function toggleRunning(expectedRevision?: number) {
    return runCommand('toggle_running', {}, expectedRevision);
  }

  function setTimeStep(nextTimeStep: number, expectedRevision?: number) {
    return runCommand('set_time_step', { value: nextTimeStep }, expectedRevision);
  }

  return {
    getState,
    getReadModel,
    createObjectAt,
    setObjectProps,
    toggleRunning,
    setTimeStep
  };
}

