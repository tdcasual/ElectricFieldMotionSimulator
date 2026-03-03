import type { SceneAggregateState, SceneObjectRecord } from './types';

type CreateObjectInput = {
  id?: string;
  type: string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
};

const DEFAULT_TIME_STEP = 0.016;
let objectSequence = 0;

function nextObjectId(revision: number) {
  objectSequence += 1;
  return `obj-${revision + 1}-${objectSequence}`;
}

function normalizeObjectType(type: string) {
  const normalized = String(type ?? '').trim();
  if (!normalized) {
    throw new Error('object type is required');
  }
  return normalized;
}

function normalizeCoordinate(value: number, key: 'x' | 'y') {
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be finite`);
  }
  return value;
}

export function createInitialSceneAggregate(): SceneAggregateState {
  return {
    version: '3.0',
    revision: 0,
    running: false,
    timeStep: DEFAULT_TIME_STEP,
    objects: []
  };
}

export function applyCreateObject(
  state: SceneAggregateState,
  input: CreateObjectInput
): SceneAggregateState {
  const type = normalizeObjectType(input.type);
  const x = normalizeCoordinate(input.x, 'x');
  const y = normalizeCoordinate(input.y, 'y');
  const id = String(input.id ?? '').trim() || nextObjectId(state.revision);
  const record: SceneObjectRecord = {
    id,
    type,
    position: { x, y },
    props: { ...(input.props ?? {}) }
  };

  return {
    ...state,
    revision: state.revision + 1,
    objects: [...state.objects, record]
  };
}

export function applyToggleRunning(state: SceneAggregateState): SceneAggregateState {
  return {
    ...state,
    revision: state.revision + 1,
    running: !state.running
  };
}

export function applySetTimeStep(
  state: SceneAggregateState,
  nextTimeStep: number
): SceneAggregateState {
  if (!Number.isFinite(nextTimeStep) || nextTimeStep <= 0) {
    throw new Error('timeStep must be a finite positive number');
  }
  return {
    ...state,
    revision: state.revision + 1,
    timeStep: nextTimeStep
  };
}

