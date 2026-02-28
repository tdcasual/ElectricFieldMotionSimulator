type SwipePoint = {
  x: number;
  y: number;
};

type PointerLikeEvent = {
  clientX?: number;
  clientY?: number;
  pointerType?: string | null;
};

type SwipeCloseGestureOptions = {
  minDistance?: number;
  maxHorizontalDrift?: number;
};

export const DEFAULT_SWIPE_CLOSE_MIN_DISTANCE = 56;
export const DEFAULT_SWIPE_CLOSE_MAX_HORIZONTAL_DRIFT = 48;

export function createSwipeCloseGesture(onClose: () => void, options: SwipeCloseGestureOptions = {}) {
  const minDistance = Number.isFinite(options.minDistance)
    ? Number(options.minDistance)
    : DEFAULT_SWIPE_CLOSE_MIN_DISTANCE;
  const maxHorizontalDrift = Number.isFinite(options.maxHorizontalDrift)
    ? Number(options.maxHorizontalDrift)
    : DEFAULT_SWIPE_CLOSE_MAX_HORIZONTAL_DRIFT;
  let startPoint: SwipePoint | null = null;

  function onPointerDown(event: PointerLikeEvent) {
    if (event?.pointerType && event.pointerType !== 'touch') return;
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    startPoint = { x, y };
  }

  function onPointerCancel() {
    startPoint = null;
  }

  function onPointerUp(event: PointerLikeEvent) {
    const start = startPoint;
    startPoint = null;
    if (!start) return;

    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const deltaY = y - start.y;
    const deltaX = Math.abs(x - start.x);
    if (deltaY >= minDistance && deltaX <= maxHorizontalDrift) {
      onClose();
    }
  }

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel
  };
}
