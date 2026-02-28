import { describe, expect, it, vi } from 'vitest';
import {
  createSwipeCloseGesture,
  DEFAULT_SWIPE_CLOSE_MAX_HORIZONTAL_DRIFT,
  DEFAULT_SWIPE_CLOSE_MIN_DISTANCE
} from '../src/utils/swipeCloseGesture';

describe('swipeCloseGesture', () => {
  it('closes when vertical swipe distance exceeds default threshold', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);

    gesture.onPointerDown({
      pointerType: 'touch',
      clientX: 100,
      clientY: 100
    });
    gesture.onPointerUp({
      pointerType: 'touch',
      clientX: 110,
      clientY: 100 + DEFAULT_SWIPE_CLOSE_MIN_DISTANCE
    });

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('does not close when vertical distance is below threshold', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);

    gesture.onPointerDown({
      pointerType: 'touch',
      clientX: 50,
      clientY: 50
    });
    gesture.onPointerUp({
      pointerType: 'touch',
      clientX: 54,
      clientY: 50 + DEFAULT_SWIPE_CLOSE_MIN_DISTANCE - 1
    });

    expect(closeSpy).toHaveBeenCalledTimes(0);
  });

  it('does not close when horizontal drift exceeds threshold', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);

    gesture.onPointerDown({
      pointerType: 'touch',
      clientX: 50,
      clientY: 50
    });
    gesture.onPointerUp({
      pointerType: 'touch',
      clientX: 50 + DEFAULT_SWIPE_CLOSE_MAX_HORIZONTAL_DRIFT + 1,
      clientY: 50 + DEFAULT_SWIPE_CLOSE_MIN_DISTANCE + 20
    });

    expect(closeSpy).toHaveBeenCalledTimes(0);
  });

  it('ignores non-touch pointer type', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);

    gesture.onPointerDown({
      pointerType: 'mouse',
      clientX: 30,
      clientY: 30
    });
    gesture.onPointerUp({
      pointerType: 'mouse',
      clientX: 30,
      clientY: 120
    });

    expect(closeSpy).toHaveBeenCalledTimes(0);
  });

  it('resets state on pointer cancel', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);

    gesture.onPointerDown({
      pointerType: 'touch',
      clientX: 20,
      clientY: 20
    });
    gesture.onPointerCancel();
    gesture.onPointerUp({
      pointerType: 'touch',
      clientX: 20,
      clientY: 160
    });

    expect(closeSpy).toHaveBeenCalledTimes(0);
  });

  it('closes when pointerup happens on document after starting on header', () => {
    const closeSpy = vi.fn();
    const gesture = createSwipeCloseGesture(closeSpy);
    const header = document.createElement('div');

    gesture.onPointerDown({
      pointerType: 'touch',
      pointerId: 7,
      clientX: 120,
      clientY: 120,
      currentTarget: header
    });

    const pointerUp = new Event('pointerup', { bubbles: true, cancelable: true });
    Object.defineProperty(pointerUp, 'pointerType', { value: 'touch' });
    Object.defineProperty(pointerUp, 'pointerId', { value: 7 });
    Object.defineProperty(pointerUp, 'clientX', { value: 122 });
    Object.defineProperty(pointerUp, 'clientY', { value: 220 });
    document.dispatchEvent(pointerUp);

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
