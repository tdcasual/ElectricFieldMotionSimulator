export type RuntimeDemoSession = {
  snapshot: Record<string, unknown>;
  wasRunning: boolean;
  selectedObjectId: string | null;
};

export function captureRuntimeDemoSession(options: {
  snapshot: Record<string, unknown>;
  wasRunning: boolean;
  selectedObjectId: string | null;
}): RuntimeDemoSession {
  return {
    snapshot: JSON.parse(JSON.stringify(options.snapshot)) as Record<string, unknown>,
    wasRunning: !!options.wasRunning,
    selectedObjectId: options.selectedObjectId ? String(options.selectedObjectId) : null
  };
}

export function replaceRuntimeDemoSessionSnapshot(options: {
  session: RuntimeDemoSession | null;
  snapshot: Record<string, unknown>;
  selectedObjectId: string | null;
}): RuntimeDemoSession | null {
  if (!options.session) return null;
  return {
    ...options.session,
    snapshot: JSON.parse(JSON.stringify(options.snapshot)) as Record<string, unknown>,
    selectedObjectId: options.selectedObjectId ? String(options.selectedObjectId) : null
  };
}

export function clearRuntimeDemoSessionSnapshot(session: RuntimeDemoSession | null): RuntimeDemoSession | null {
  if (!session) return null;
  return replaceRuntimeDemoSessionSnapshot({
    session,
    snapshot: {
      ...session.snapshot,
      objects: []
    },
    selectedObjectId: null
  });
}

export function restoreRuntimeDemoSession(options: {
  scene: {
    clear: () => void;
    loadFromData: (snapshot: Record<string, unknown>) => void;
  };
  session: RuntimeDemoSession | null;
  restoreSelectedObjectById: (selectedObjectId: string | null) => void;
}): boolean {
  if (!options.session?.snapshot) return false;
  options.scene.clear();
  options.scene.loadFromData(options.session.snapshot);
  options.restoreSelectedObjectById(options.session.selectedObjectId ?? null);
  return true;
}
