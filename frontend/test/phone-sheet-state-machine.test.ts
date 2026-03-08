import { describe, expect, it } from 'vitest';
import {
  applyPhoneSelectionChange,
  applyPhoneSheetActivation,
  createPhoneSheetSessionState,
  resetPhoneSheetSessionState
} from '../src/modes/phoneSheetStateMachine';

describe('phoneSheetStateMachine', () => {
  it('blocks selected sheet activation when selection is missing', () => {
    const next = applyPhoneSheetActivation(createPhoneSheetSessionState(), {
      nextSheet: 'selected',
      isPhoneLayout: true,
      hasSelection: false,
      canOpenSelectedSheet: false
    });

    expect(next).toEqual({
      activeSheet: null,
      pendingRestoreSheet: null
    });
  });

  it('promotes add sheet into selected after creation selection appears', () => {
    const next = applyPhoneSelectionChange(
      {
        activeSheet: 'add',
        pendingRestoreSheet: null
      },
      {
        hasSelection: true,
        demoMode: false,
        canRestoreSelectedSheet: true
      }
    );

    expect(next).toEqual({
      activeSheet: 'selected',
      pendingRestoreSheet: null
    });
  });

  it('remembers selected sheet when demo temporarily clears selection', () => {
    const next = applyPhoneSelectionChange(
      {
        activeSheet: 'selected',
        pendingRestoreSheet: null
      },
      {
        hasSelection: false,
        demoMode: true,
        canRestoreSelectedSheet: true
      }
    );

    expect(next).toEqual({
      activeSheet: null,
      pendingRestoreSheet: 'selected'
    });
  });

  it('restores selected sheet when selection returns after demo suspension', () => {
    const next = applyPhoneSelectionChange(
      {
        activeSheet: null,
        pendingRestoreSheet: 'selected'
      },
      {
        hasSelection: true,
        demoMode: false,
        canRestoreSelectedSheet: true
      }
    );

    expect(next).toEqual({
      activeSheet: 'selected',
      pendingRestoreSheet: null
    });
  });

  it('drops pending selected restore when payload refresh fails', () => {
    const next = applyPhoneSelectionChange(
      {
        activeSheet: null,
        pendingRestoreSheet: 'selected'
      },
      {
        hasSelection: true,
        demoMode: false,
        canRestoreSelectedSheet: false
      }
    );

    expect(next).toEqual({
      activeSheet: null,
      pendingRestoreSheet: null
    });
  });

  it('resets active sheet and pending restore together', () => {
    expect(
      resetPhoneSheetSessionState({
        activeSheet: 'more',
        pendingRestoreSheet: 'selected'
      })
    ).toEqual({
      activeSheet: null,
      pendingRestoreSheet: null
    });
  });
});
