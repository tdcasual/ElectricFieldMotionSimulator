import { describe, expect, it } from 'vitest';
import {
  captureDemoAuthoringRestoreState,
  consumeDemoAuthoringRestoreState,
  createDemoAuthoringRestoreState
} from '../src/stores/demoAuthoringSession';

describe('demoAuthoringSession', () => {
  it('captures property drawer restore intent only when selection exists', () => {
    expect(
      captureDemoAuthoringRestoreState({
        propertyDrawerOpen: true,
        selectedObjectId: 'obj-1'
      })
    ).toEqual({
      restorePropertyDrawer: true
    });

    expect(
      captureDemoAuthoringRestoreState({
        propertyDrawerOpen: true,
        selectedObjectId: null
      })
    ).toEqual({
      restorePropertyDrawer: false
    });
  });

  it('reopens property drawer when pending restore survives demo exit', () => {
    const result = consumeDemoAuthoringRestoreState(
      {
        restorePropertyDrawer: true
      },
      {
        selectedObjectId: 'obj-1'
      }
    );

    expect(result).toEqual({
      nextState: createDemoAuthoringRestoreState(),
      shouldReopenPropertyDrawer: true
    });
  });

  it('clears pending restore when selection is not restorable', () => {
    const result = consumeDemoAuthoringRestoreState(
      {
        restorePropertyDrawer: true
      },
      {
        selectedObjectId: null
      }
    );

    expect(result).toEqual({
      nextState: createDemoAuthoringRestoreState(),
      shouldReopenPropertyDrawer: false
    });
  });
});
