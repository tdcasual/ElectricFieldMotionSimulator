import { describe, expect, it } from 'vitest';
import {
  hitTestTopmostObjectId,
  isPointInGeometry,
  resolveMagneticRenderRadius,
  resolveObjectRenderGeometry,
  resolveObjectSelectionGeometry,
  resolveSelectionPadding
} from '../src/v3/domain/geometry';

describe('v3 geometry rules', () => {
  it('uses unified magnetic radius resolution', () => {
    const radius = resolveMagneticRenderRadius({
      id: 'm-1',
      type: 'magnetic-field',
      x: 0,
      y: 0,
      radius: 20,
      width: 100,
      height: 120
    });

    expect(radius).toBe(50);
  });

  it('projects electric field as centered rectangle geometry', () => {
    const geometry = resolveObjectRenderGeometry({
      id: 'e-1',
      type: 'electric-field',
      x: 60,
      y: 70,
      radius: 10,
      width: 40,
      height: 20
    });

    expect(geometry).toEqual({
      kind: 'rect',
      x: 40,
      y: 60,
      width: 40,
      height: 20
    });
  });

  it('selects topmost object by reverse traversal in hit-test', () => {
    const selected = hitTestTopmostObjectId(
      [
        { id: 'base', type: 'particle', x: 100, y: 100, radius: 30, width: 20, height: 20 },
        { id: 'top', type: 'particle', x: 100, y: 100, radius: 30, width: 20, height: 20 }
      ],
      100,
      100
    );

    expect(selected).toBe('top');
  });

  it('resolves selection geometry with per-type padding', () => {
    const electricPadding = resolveSelectionPadding('electric-field');
    const magneticPadding = resolveSelectionPadding('magnetic-field');

    expect(electricPadding).toBe(6);
    expect(magneticPadding).toBe(8);

    const electricSelection = resolveObjectSelectionGeometry({
      id: 'e-1',
      type: 'electric-field',
      x: 50,
      y: 50,
      radius: 10,
      width: 40,
      height: 20
    });
    expect(electricSelection).toEqual({
      kind: 'rect',
      x: 24,
      y: 34,
      width: 52,
      height: 32
    });
  });

  it('supports direct geometry point inclusion checks', () => {
    expect(
      isPointInGeometry({ kind: 'circle', centerX: 0, centerY: 0, radius: 10 }, 6, 8)
    ).toBe(true);
    expect(
      isPointInGeometry({ kind: 'circle', centerX: 0, centerY: 0, radius: 10 }, 11, 0)
    ).toBe(false);
  });
});
