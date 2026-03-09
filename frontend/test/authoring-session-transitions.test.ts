import { describe, expect, it } from 'vitest';
import {
  activateAuthoringDrawer,
  captureAuthoringDemoRestoreState,
  closeAuthoringDrawer,
  consumeAuthoringDemoRestoreState,
  createAuthoringSessionState
} from '../src/session/authoringSessionTransitions';

describe('authoringSessionTransitions', () => {
  it('restores the previous drawer when the top drawer closes', () => {
    let state = createAuthoringSessionState();
    state = activateAuthoringDrawer(state, 'variables');
    state = activateAuthoringDrawer(state, 'markdown');

    const result = closeAuthoringDrawer(state, 'markdown');

    expect(result.nextState.activeDrawer).toBe('variables');
    expect(result.nextState.drawerHistory).toEqual([]);
    expect(result.restoredDrawer).toBe('variables');
  });

  it('does not restore property drawer without selection context', () => {
    let state = createAuthoringSessionState();
    state = activateAuthoringDrawer(state, 'property');
    state = activateAuthoringDrawer(state, 'markdown');

    const result = closeAuthoringDrawer(state, 'markdown', {
      selectedObjectId: null,
      propertyDrawerSelectionId: 'obj-1'
    });

    expect(result.nextState.activeDrawer).toBeNull();
    expect(result.nextState.drawerHistory).toEqual([]);
    expect(result.restoredDrawer).toBeNull();
  });

  it('captures and consumes demo restore intent through the shared session state', () => {
    const captured = captureAuthoringDemoRestoreState(createAuthoringSessionState(), {
      propertyDrawerOpen: true,
      selectedObjectId: 'obj-1'
    });

    const consumed = consumeAuthoringDemoRestoreState(captured, {
      selectedObjectId: 'obj-1'
    });

    expect(consumed.shouldReopenPropertyDrawer).toBe(true);
    expect(consumed.nextState.pendingDemoRestore.restorePropertyDrawer).toBe(false);
  });
});
