import type {
  SceneAggregateState,
  SceneObjectRecord,
  SceneObjectType,
  SceneViewport
} from './types';

type CreateObjectInput = {
  id?: string;
  type: SceneObjectType | string;
  x: number;
  y: number;
  props?: Record<string, unknown>;
};

type SetObjectPropsInput = {
  id: string;
  props: Record<string, unknown>;
};

type MoveObjectInput = {
  id: string;
  x: number;
  y: number;
};

const DEFAULT_TIME_STEP = 0.016;
const DEFAULT_VIEWPORT: SceneViewport = {
  width: 1280,
  height: 720
};
const MIN_OBJECT_RADIUS = 6;
let objectSequence = 0;

function nextObjectId(revision: number) {
  objectSequence += 1;
  return `obj-${revision + 1}-${objectSequence}`;
}

function normalizeObjectType(type: string): SceneObjectType {
  const raw = String(type ?? '').trim();
  if (raw === 'particle' || raw === 'electric-field' || raw === 'magnetic-field') {
    return raw;
  }
  if (raw === 'electric-field-rect' || raw === 'electric-field-circle' || raw === 'semicircle-electric-field') {
    return 'electric-field';
  }
  if (raw === 'magnetic-field-circle' || raw === 'magnetic-field-triangle' || raw === 'magnetic-field-long') {
    return 'magnetic-field';
  }
  if (!raw) {
    throw new Error('object type is required');
  }
  return 'particle';
}

function normalizeFinite(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePositive(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return number;
}

function normalizeCoordinate(value: number, key: 'x' | 'y') {
  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be finite`);
  }
  return value;
}

function defaultSizeForType(type: SceneObjectType) {
  if (type === 'electric-field') {
    return {
      radius: 26,
      width: 140,
      height: 92,
      color: '#f1b862'
    };
  }
  if (type === 'magnetic-field') {
    return {
      radius: 30,
      width: 124,
      height: 124,
      color: '#8e79d6'
    };
  }
  return {
    radius: 10,
    width: 20,
    height: 20,
    color: '#58a6ff'
  };
}

function createObjectRecord(input: CreateObjectInput, revision: number): SceneObjectRecord {
  const type = normalizeObjectType(input.type);
  const x = normalizeCoordinate(input.x, 'x');
  const y = normalizeCoordinate(input.y, 'y');
  const id = String(input.id ?? '').trim() || nextObjectId(revision);
  const defaults = defaultSizeForType(type);
  const props = { ...(input.props ?? {}) };

  return {
    id,
    type,
    position: { x, y },
    velocity: {
      x: normalizeFinite(props.velocityX, type === 'particle' ? 90 : 0),
      y: normalizeFinite(props.velocityY, 0)
    },
    radius: Math.max(MIN_OBJECT_RADIUS, normalizePositive(props.radius, defaults.radius)),
    width: Math.max(MIN_OBJECT_RADIUS * 2, normalizePositive(props.width, defaults.width)),
    height: Math.max(MIN_OBJECT_RADIUS * 2, normalizePositive(props.height, defaults.height)),
    color: String(props.color ?? defaults.color),
    props
  };
}

function normalizeViewport(next: SceneViewport): SceneViewport {
  return {
    width: Math.max(320, Math.round(normalizePositive(next.width, DEFAULT_VIEWPORT.width))),
    height: Math.max(240, Math.round(normalizePositive(next.height, DEFAULT_VIEWPORT.height)))
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findObjectIndex(state: SceneAggregateState, objectId: string) {
  return state.objects.findIndex((item) => item.id === objectId);
}

export function createInitialSceneAggregate(): SceneAggregateState {
  return {
    version: '3.0',
    revision: 0,
    running: false,
    timeStep: DEFAULT_TIME_STEP,
    viewport: { ...DEFAULT_VIEWPORT },
    selectedObjectId: null,
    objects: []
  };
}

export function applyCreateObject(
  state: SceneAggregateState,
  input: CreateObjectInput
): SceneAggregateState {
  const record = createObjectRecord(input, state.revision);
  return {
    ...state,
    revision: state.revision + 1,
    selectedObjectId: record.id,
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

export function applySetRunning(state: SceneAggregateState, nextRunning: boolean): SceneAggregateState {
  const normalized = !!nextRunning;
  if (state.running === normalized) return state;
  return {
    ...state,
    revision: state.revision + 1,
    running: normalized
  };
}

export function applySetTimeStep(
  state: SceneAggregateState,
  nextTimeStep: number
): SceneAggregateState {
  if (!Number.isFinite(nextTimeStep) || nextTimeStep <= 0) {
    throw new Error('timeStep must be a finite positive number');
  }
  if (Math.abs(state.timeStep - nextTimeStep) < 1e-9) return state;
  return {
    ...state,
    revision: state.revision + 1,
    timeStep: nextTimeStep
  };
}

export function applySetViewport(
  state: SceneAggregateState,
  nextViewport: SceneViewport
): SceneAggregateState {
  const viewport = normalizeViewport(nextViewport);
  if (
    viewport.width === state.viewport.width &&
    viewport.height === state.viewport.height
  ) {
    return state;
  }
  return {
    ...state,
    revision: state.revision + 1,
    viewport
  };
}

export function applySelectObject(
  state: SceneAggregateState,
  objectId: string | null
): SceneAggregateState {
  const normalized = objectId ? String(objectId).trim() : null;
  if (normalized && findObjectIndex(state, normalized) < 0) {
    throw new Error(`object id not found: ${normalized}`);
  }
  if (state.selectedObjectId === normalized) return state;
  return {
    ...state,
    revision: state.revision + 1,
    selectedObjectId: normalized
  };
}

export function applyDeleteObject(
  state: SceneAggregateState,
  objectId: string
): SceneAggregateState {
  const normalized = String(objectId ?? '').trim();
  if (!normalized) {
    throw new Error('object id is required');
  }
  const index = findObjectIndex(state, normalized);
  if (index < 0) {
    throw new Error(`object id not found: ${normalized}`);
  }
  const nextObjects = state.objects.filter((item) => item.id !== normalized);
  return {
    ...state,
    revision: state.revision + 1,
    selectedObjectId: state.selectedObjectId === normalized ? null : state.selectedObjectId,
    objects: nextObjects
  };
}

export function applyClearScene(state: SceneAggregateState): SceneAggregateState {
  if (state.objects.length === 0 && !state.selectedObjectId) return state;
  return {
    ...state,
    revision: state.revision + 1,
    selectedObjectId: null,
    objects: []
  };
}

export function applyMoveObject(
  state: SceneAggregateState,
  input: MoveObjectInput
): SceneAggregateState {
  const targetId = String(input.id ?? '').trim();
  if (!targetId) {
    throw new Error('object id is required');
  }
  const index = findObjectIndex(state, targetId);
  if (index < 0) {
    throw new Error(`object id not found: ${targetId}`);
  }

  const x = normalizeCoordinate(input.x, 'x');
  const y = normalizeCoordinate(input.y, 'y');
  const target = state.objects[index];
  const nextObjects = [...state.objects];
  nextObjects[index] = {
    ...target,
    position: { x, y }
  };

  return {
    ...state,
    revision: state.revision + 1,
    objects: nextObjects
  };
}

export function applySetObjectProps(
  state: SceneAggregateState,
  input: SetObjectPropsInput
): SceneAggregateState {
  const targetId = String(input.id ?? '').trim();
  if (!targetId) {
    throw new Error('object id is required');
  }
  const index = findObjectIndex(state, targetId);
  if (index < 0) {
    throw new Error(`object id not found: ${targetId}`);
  }

  const target = state.objects[index];
  const nextProps = {
    ...target.props,
    ...(input.props ?? {})
  };
  const nextObject: SceneObjectRecord = {
    ...target,
    radius: Math.max(MIN_OBJECT_RADIUS, normalizePositive(nextProps.radius, target.radius)),
    width: Math.max(MIN_OBJECT_RADIUS * 2, normalizePositive(nextProps.width, target.width)),
    height: Math.max(MIN_OBJECT_RADIUS * 2, normalizePositive(nextProps.height, target.height)),
    color: String(nextProps.color ?? target.color),
    velocity: {
      x: normalizeFinite(nextProps.velocityX, target.velocity.x),
      y: normalizeFinite(nextProps.velocityY, target.velocity.y)
    },
    position: {
      x: normalizeFinite(nextProps.x, target.position.x),
      y: normalizeFinite(nextProps.y, target.position.y)
    },
    props: nextProps
  };

  const nextObjects = [...state.objects];
  nextObjects[index] = nextObject;

  return {
    ...state,
    revision: state.revision + 1,
    objects: nextObjects
  };
}

export function applyStepSimulation(
  state: SceneAggregateState,
  dt: number
): SceneAggregateState {
  if (!state.running) return state;
  if (!Number.isFinite(dt) || dt <= 0) {
    throw new Error('dt must be a finite positive number');
  }

  const width = Math.max(1, state.viewport.width);
  const height = Math.max(1, state.viewport.height);

  const nextObjects = state.objects.map((item) => {
    if (item.type !== 'particle') return item;

    const radius = Math.max(MIN_OBJECT_RADIUS, item.radius);
    const minX = radius;
    const maxX = width - radius;
    const minY = radius;
    const maxY = height - radius;

    let nextX = item.position.x + (item.velocity.x * dt);
    let nextY = item.position.y + (item.velocity.y * dt);
    let nextVx = item.velocity.x;
    let nextVy = item.velocity.y;

    if (nextX < minX || nextX > maxX) {
      nextVx = -nextVx;
      nextX = clamp(nextX, minX, maxX);
    }
    if (nextY < minY || nextY > maxY) {
      nextVy = -nextVy;
      nextY = clamp(nextY, minY, maxY);
    }

    return {
      ...item,
      position: {
        x: nextX,
        y: nextY
      },
      velocity: {
        x: nextVx,
        y: nextVy
      }
    };
  });

  return {
    ...state,
    revision: state.revision + 1,
    objects: nextObjects
  };
}

export function coerceSceneAggregateState(input: unknown): SceneAggregateState {
  if (!input || typeof input !== 'object') {
    throw new Error('scene payload must be an object');
  }
  const record = input as Record<string, unknown>;
  if (record.version !== '3.0') {
    throw new Error('only scene version 3.0 is supported');
  }

  const base = createInitialSceneAggregate();
  const objectsInput = Array.isArray(record.objects) ? record.objects : [];
  const objects = objectsInput
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const position = item.position;
      const positionRecord = position && typeof position === 'object'
        ? (position as Record<string, unknown>)
        : null;
      const velocity = item.velocity;
      const velocityRecord = velocity && typeof velocity === 'object'
        ? (velocity as Record<string, unknown>)
        : null;

      return createObjectRecord(
        {
          id: typeof item.id === 'string' ? item.id : undefined,
          type: String(item.type ?? 'particle'),
          x: normalizeFinite(item.x ?? positionRecord?.x, 0),
          y: normalizeFinite(item.y ?? positionRecord?.y, 0),
          props: {
            ...item,
            velocityX: item.velocityX ?? velocityRecord?.x,
            velocityY: item.velocityY ?? velocityRecord?.y
          }
        },
        Number(record.revision) || 0
      );
    });

  const viewportInput = (record.viewport ?? {}) as Record<string, unknown>;
  const viewport = normalizeViewport({
    width: normalizeFinite(viewportInput.width, base.viewport.width),
    height: normalizeFinite(viewportInput.height, base.viewport.height)
  });
  const selectedObjectId = typeof record.selectedObjectId === 'string' ? record.selectedObjectId : null;

  return {
    version: '3.0',
    revision: Math.max(0, Math.trunc(normalizeFinite(record.revision, 0))),
    running: record.running === true,
    timeStep: normalizePositive(record.timeStep, base.timeStep),
    viewport,
    selectedObjectId: selectedObjectId && objects.some((item) => item.id === selectedObjectId) ? selectedObjectId : null,
    objects
  };
}
