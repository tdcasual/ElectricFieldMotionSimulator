import type {
  PointerFsmState,
  PointerInputEvent,
  PointerIntent
} from './types';

type PointerFsmOptions = {
  dragThresholdPx?: number;
};

type ActivePointerContext = {
  pointerId: number;
  startX: number;
  startY: number;
  targetObjectId: string | null;
};

function distanceSquared(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return (dx * dx) + (dy * dy);
}

export function createPointerFsm(options: PointerFsmOptions = {}) {
  const threshold = Number.isFinite(options.dragThresholdPx) && (options.dragThresholdPx ?? 0) > 0
    ? Number(options.dragThresholdPx)
    : 4;
  const thresholdSq = threshold * threshold;

  let state: PointerFsmState = 'idle';
  let active: ActivePointerContext | null = null;

  function reset() {
    state = 'idle';
    active = null;
  }

  function handle(event: PointerInputEvent): PointerIntent[] {
    if (state === 'idle') {
      if (event.type !== 'pointer_down') return [];
      state = 'pressed';
      active = {
        pointerId: event.pointerId,
        startX: event.x,
        startY: event.y,
        targetObjectId: event.targetObjectId
      };
      return [];
    }

    if (!active || event.pointerId !== active.pointerId) {
      return [];
    }

    if (state === 'pressed') {
      if (event.type === 'pointer_move') {
        const movedSq = distanceSquared(event.x, event.y, active.startX, active.startY);
        if (movedSq < thresholdSq) return [];
        state = 'dragging';
        return [
          {
            type: 'begin_drag',
            pointerId: active.pointerId,
            start: { x: active.startX, y: active.startY },
            current: { x: event.x, y: event.y },
            targetObjectId: active.targetObjectId
          }
        ];
      }

      if (event.type === 'pointer_up') {
        const intent: PointerIntent = {
          type: 'select',
          pointerId: active.pointerId,
          x: event.x,
          y: event.y,
          targetObjectId: event.targetObjectId ?? active.targetObjectId
        };
        reset();
        return [intent];
      }

      if (event.type === 'pointer_cancel') {
        reset();
        return [];
      }

      return [];
    }

    if (event.type === 'pointer_move') {
      return [
        {
          type: 'update_drag',
          pointerId: active.pointerId,
          current: { x: event.x, y: event.y }
        }
      ];
    }

    if (event.type === 'pointer_up') {
      const intent: PointerIntent = {
        type: 'commit_drag',
        pointerId: active.pointerId,
        end: { x: event.x, y: event.y }
      };
      reset();
      return [intent];
    }

    if (event.type === 'pointer_cancel') {
      const intent: PointerIntent = {
        type: 'cancel_drag',
        pointerId: active.pointerId
      };
      reset();
      return [intent];
    }

    return [];
  }

  function getState(): PointerFsmState {
    return state;
  }

  return {
    handle,
    getState
  };
}

