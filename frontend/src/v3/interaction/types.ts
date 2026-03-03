export type PointerFsmState = 'idle' | 'pressed' | 'dragging';

export type PointerDownEvent = {
  type: 'pointer_down';
  pointerId: number;
  x: number;
  y: number;
  targetObjectId: string | null;
};

export type PointerMoveEvent = {
  type: 'pointer_move';
  pointerId: number;
  x: number;
  y: number;
};

export type PointerUpEvent = {
  type: 'pointer_up';
  pointerId: number;
  x: number;
  y: number;
  targetObjectId?: string | null;
};

export type PointerCancelEvent = {
  type: 'pointer_cancel';
  pointerId: number;
};

export type PointerInputEvent =
  | PointerDownEvent
  | PointerMoveEvent
  | PointerUpEvent
  | PointerCancelEvent;

export type PointerIntentSelect = {
  type: 'select';
  pointerId: number;
  x: number;
  y: number;
  targetObjectId: string | null;
};

export type PointerIntentBeginDrag = {
  type: 'begin_drag';
  pointerId: number;
  start: {
    x: number;
    y: number;
  };
  current: {
    x: number;
    y: number;
  };
  targetObjectId: string | null;
};

export type PointerIntentUpdateDrag = {
  type: 'update_drag';
  pointerId: number;
  current: {
    x: number;
    y: number;
  };
};

export type PointerIntentCommitDrag = {
  type: 'commit_drag';
  pointerId: number;
  end: {
    x: number;
    y: number;
  };
};

export type PointerIntentCancelDrag = {
  type: 'cancel_drag';
  pointerId: number;
};

export type PointerIntent =
  | PointerIntentSelect
  | PointerIntentBeginDrag
  | PointerIntentUpdateDrag
  | PointerIntentCommitDrag
  | PointerIntentCancelDrag;

