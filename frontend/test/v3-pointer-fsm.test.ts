import { describe, expect, it } from 'vitest';
import { createPointerFsm } from '../src/v3/interaction/pointerFsm';

describe('v3 pointer FSM', () => {
  it('emits select intent on tap without drag', () => {
    const fsm = createPointerFsm({ dragThresholdPx: 6 });

    expect(
      fsm.handle({
        type: 'pointer_down',
        pointerId: 1,
        x: 100,
        y: 120,
        targetObjectId: 'obj-1'
      })
    ).toEqual([]);

    expect(
      fsm.handle({
        type: 'pointer_up',
        pointerId: 1,
        x: 100,
        y: 120,
        targetObjectId: 'obj-1'
      })
    ).toEqual([
      {
        type: 'select',
        pointerId: 1,
        x: 100,
        y: 120,
        targetObjectId: 'obj-1'
      }
    ]);
    expect(fsm.getState()).toBe('idle');
  });

  it('emits begin/update/commit drag intents after threshold', () => {
    const fsm = createPointerFsm({ dragThresholdPx: 5 });

    fsm.handle({
      type: 'pointer_down',
      pointerId: 2,
      x: 10,
      y: 10,
      targetObjectId: 'obj-drag'
    });

    expect(
      fsm.handle({
        type: 'pointer_move',
        pointerId: 2,
        x: 12,
        y: 12
      })
    ).toEqual([]);

    const beginDrag = fsm.handle({
      type: 'pointer_move',
      pointerId: 2,
      x: 20,
      y: 20
    });
    expect(beginDrag).toEqual([
      {
        type: 'begin_drag',
        pointerId: 2,
        start: { x: 10, y: 10 },
        current: { x: 20, y: 20 },
        targetObjectId: 'obj-drag'
      }
    ]);

    const updateDrag = fsm.handle({
      type: 'pointer_move',
      pointerId: 2,
      x: 24,
      y: 26
    });
    expect(updateDrag).toEqual([
      {
        type: 'update_drag',
        pointerId: 2,
        current: { x: 24, y: 26 }
      }
    ]);

    const commit = fsm.handle({
      type: 'pointer_up',
      pointerId: 2,
      x: 24,
      y: 26
    });
    expect(commit).toEqual([
      {
        type: 'commit_drag',
        pointerId: 2,
        end: { x: 24, y: 26 }
      }
    ]);
    expect(fsm.getState()).toBe('idle');
  });

  it('emits cancel_drag and resets on pointer cancel', () => {
    const fsm = createPointerFsm({ dragThresholdPx: 4 });
    fsm.handle({
      type: 'pointer_down',
      pointerId: 3,
      x: 1,
      y: 1,
      targetObjectId: 'obj-cancel'
    });
    fsm.handle({
      type: 'pointer_move',
      pointerId: 3,
      x: 10,
      y: 10
    });

    const cancel = fsm.handle({
      type: 'pointer_cancel',
      pointerId: 3
    });

    expect(cancel).toEqual([
      {
        type: 'cancel_drag',
        pointerId: 3
      }
    ]);
    expect(fsm.getState()).toBe('idle');
  });

  it('ignores events from non-active pointer', () => {
    const fsm = createPointerFsm();
    fsm.handle({
      type: 'pointer_down',
      pointerId: 7,
      x: 0,
      y: 0,
      targetObjectId: null
    });

    expect(
      fsm.handle({
        type: 'pointer_move',
        pointerId: 99,
        x: 40,
        y: 40
      })
    ).toEqual([]);
    expect(fsm.getState()).toBe('pressed');
  });
});
