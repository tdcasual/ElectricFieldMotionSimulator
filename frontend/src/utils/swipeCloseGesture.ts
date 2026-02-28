type SwipePoint = {
  x: number;
  y: number;
};

type PointerLikeEvent = {
  clientX?: number;
  clientY?: number;
  pointerType?: string | null;
  pointerId?: number;
  currentTarget?: EventTarget | null;
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
  let activePointerId: number | null = null;
  let activeDocument: Document | null = null;

  function detachDocumentListeners() {
    if (!activeDocument) return;
    activeDocument.removeEventListener('pointerup', handleDocumentPointerUp, true);
    activeDocument.removeEventListener('pointercancel', handleDocumentPointerCancel, true);
    activeDocument = null;
  }

  function resetGestureState() {
    startPoint = null;
    activePointerId = null;
    detachDocumentListeners();
  }

  function resolvePointerId(event: PointerLikeEvent | undefined) {
    const pointerId = Number(event?.pointerId);
    if (!Number.isFinite(pointerId)) return null;
    return pointerId;
  }

  function isSamePointer(event: PointerLikeEvent | undefined) {
    if (activePointerId == null) return true;
    const pointerId = resolvePointerId(event);
    if (pointerId == null) return true;
    return pointerId === activePointerId;
  }

  function resolveOwnerDocument(event: PointerLikeEvent) {
    const target = event.currentTarget as { ownerDocument?: Document | null } | null | undefined;
    if (target?.ownerDocument) return target.ownerDocument;
    if (typeof document !== 'undefined') return document;
    return null;
  }

  function handleDocumentPointerUp(event: Event) {
    onPointerUp(event as PointerLikeEvent);
  }

  function handleDocumentPointerCancel(event: Event) {
    onPointerCancel(event as PointerLikeEvent);
  }

  function attachDocumentListeners(ownerDocument: Document | null) {
    if (!ownerDocument || activeDocument === ownerDocument) return;
    detachDocumentListeners();
    activeDocument = ownerDocument;
    activeDocument.addEventListener('pointerup', handleDocumentPointerUp, true);
    activeDocument.addEventListener('pointercancel', handleDocumentPointerCancel, true);
  }

  function onPointerDown(event: PointerLikeEvent) {
    if (event?.pointerType && event.pointerType !== 'touch') return;
    const x = Number(event?.clientX);
    const y = Number(event?.clientY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    resetGestureState();
    startPoint = { x, y };
    activePointerId = resolvePointerId(event);
    attachDocumentListeners(resolveOwnerDocument(event));
  }

  function onPointerCancel(event?: PointerLikeEvent) {
    if (!isSamePointer(event)) return;
    resetGestureState();
  }

  function onPointerUp(event: PointerLikeEvent) {
    if (!isSamePointer(event)) return;
    const start = startPoint;
    resetGestureState();
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
