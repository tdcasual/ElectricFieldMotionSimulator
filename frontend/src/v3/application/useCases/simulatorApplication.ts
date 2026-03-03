import type { CommandExecutionResult } from '../types';
import { createTransactionalCommandBus } from '../commandBus';
import {
  applyClearScene,
  applyCreateObject,
  applyDeleteObject,
  applyMoveObject,
  applySelectObject,
  applySetObjectProps,
  applySetRunning,
  applySetTimeStep,
  applySetViewport,
  applyStepSimulation,
  applyToggleRunning,
  coerceSceneAggregateState,
  createInitialSceneAggregate
} from '../../domain/sceneAggregate';
import type { SceneAggregateState, SceneViewport } from '../../domain/types';
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

type MoveObjectPayload = {
  id: string;
  x: number;
  y: number;
};

type SetObjectPropsPayload = {
  id: string;
  props: Record<string, unknown>;
};

type SetViewportPayload = {
  width: number;
  height: number;
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
  bus.register('move_object', (current, payload: MoveObjectPayload) =>
    applyMoveObject(current, payload)
  );
  bus.register('set_object_props', (current, payload: SetObjectPropsPayload) =>
    applySetObjectProps(current, payload)
  );
  bus.register('delete_object', (current, payload: { id: string }) =>
    applyDeleteObject(current, payload.id)
  );
  bus.register('select_object', (current, payload: { id: string | null }) =>
    applySelectObject(current, payload.id)
  );
  bus.register('clear_scene', (current) => applyClearScene(current));
  bus.register('toggle_running', (current) => applyToggleRunning(current));
  bus.register('set_running', (current, payload: { value: boolean }) =>
    applySetRunning(current, payload.value)
  );
  bus.register('set_time_step', (current, payload: { value: number }) =>
    applySetTimeStep(current, payload.value)
  );
  bus.register('set_viewport', (current, payload: SetViewportPayload) =>
    applySetViewport(current, payload)
  );
  bus.register('load_scene', (_current, payload: unknown) =>
    coerceSceneAggregateState(payload)
  );
  bus.register('step_simulation', (current, payload: { dt: number }) =>
    applyStepSimulation(current, payload.dt)
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

  function moveObject(
    payload: MoveObjectPayload,
    expectedRevision?: number
  ) {
    return runCommand('move_object', payload, expectedRevision);
  }

  function setObjectProps(
    payload: SetObjectPropsPayload,
    expectedRevision?: number
  ) {
    return runCommand('set_object_props', payload, expectedRevision);
  }

  function deleteObject(id: string, expectedRevision?: number) {
    return runCommand('delete_object', { id }, expectedRevision);
  }

  function selectObject(id: string | null, expectedRevision?: number) {
    return runCommand('select_object', { id }, expectedRevision);
  }

  function clearScene(expectedRevision?: number) {
    return runCommand('clear_scene', {}, expectedRevision);
  }

  function toggleRunning(expectedRevision?: number) {
    return runCommand('toggle_running', {}, expectedRevision);
  }

  function startRunning(expectedRevision?: number) {
    return runCommand('set_running', { value: true }, expectedRevision);
  }

  function stopRunning(expectedRevision?: number) {
    return runCommand('set_running', { value: false }, expectedRevision);
  }

  function setTimeStep(nextTimeStep: number, expectedRevision?: number) {
    return runCommand('set_time_step', { value: nextTimeStep }, expectedRevision);
  }

  function setViewport(viewport: SceneViewport, expectedRevision?: number) {
    return runCommand('set_viewport', viewport, expectedRevision);
  }

  function loadScene(payload: unknown, expectedRevision?: number) {
    return runCommand('load_scene', payload, expectedRevision);
  }

  function stepSimulation(dt?: number, expectedRevision?: number) {
    const delta = Number.isFinite(dt) && (dt as number) > 0
      ? (dt as number)
      : state.timeStep;
    return runCommand('step_simulation', { dt: delta }, expectedRevision);
  }

  function exportScene() {
    return cloneWithFallback(state);
  }

  publishReadModel();

  return {
    getState,
    getReadModel,
    createObjectAt,
    moveObject,
    setObjectProps,
    deleteObject,
    selectObject,
    clearScene,
    toggleRunning,
    startRunning,
    stopRunning,
    setTimeStep,
    setViewport,
    loadScene,
    stepSimulation,
    exportScene
  };
}
