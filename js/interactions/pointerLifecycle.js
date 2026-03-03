function resetPointerInteractionFields(manager) {
    manager.isDragging = false;
    manager.draggingObject = null;
    manager.pointerDownPos = null;
    manager.pointerDownObject = null;
    manager.longPressTriggered = false;
    manager.clearTangencyHint?.();
    manager.clearGeometryOverlayHint?.();
    manager.dragMode = 'move';
    manager.resizeHandle = null;
    manager.resizeStart = null;
    manager.vertexHandleIndex = null;
    manager.isPanning = false;
    manager.panStartScreen = null;
    manager.panStartCamera = null;
}

function releasePointerCapture(manager, pointerId) {
    if (pointerId == null) return;
    manager.canvas?.releasePointerCapture?.(pointerId);
}

function setCursorDefault(manager) {
    if (!manager.canvas) return;
    manager.canvas.style.cursor = 'default';
}

export function clearPointerInteractionState(manager) {
    if (!manager || typeof manager !== 'object') return;
    manager.clearLongPressTimer?.();
    resetPointerInteractionFields(manager);
    releasePointerCapture(manager, manager.activePointerId);
    manager.activePointerId = null;
    setCursorDefault(manager);
}

export function finalizePointerUpInteraction(manager, eventLike) {
    if (!manager || typeof manager !== 'object') return;
    resetPointerInteractionFields(manager);

    if (eventLike?.pointerType === 'mouse') {
        setCursorDefault(manager);
    }

    releasePointerCapture(manager, eventLike?.pointerId);
    manager.activePointerId = null;
}

export function cancelPointerInteraction(manager, eventLike) {
    if (!manager || typeof manager !== 'object') return;
    manager.clearLongPressTimer?.();
    resetPointerInteractionFields(manager);
    manager.resetTapChain?.();
    releasePointerCapture(manager, eventLike?.pointerId);
    manager.activePointerId = null;
    setCursorDefault(manager);
}
