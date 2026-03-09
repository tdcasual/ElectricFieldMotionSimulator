export function createTapChainState() {
    return { time: 0, objectId: null };
}

export function resetTapChainState() {
    return createTapChainState();
}

export function updateTapChainState(state, objectId, now) {
    return {
        time: now,
        objectId: objectId == null ? null : String(objectId)
    };
}

export function isDoubleTapCandidate(state, objectId, now, thresholdMs = 350) {
    if (!objectId || !state?.objectId) return false;
    return state.objectId === String(objectId) && (now - state.time) < thresholdMs;
}
