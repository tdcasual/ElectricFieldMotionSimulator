import { describe, expect, it } from 'vitest';
import { buildPhoneGeometryRows } from '../src/modes/phoneGeometry';

describe('phoneGeometry', () => {
  it('builds paired real/display rows from schema sections', () => {
    const rows = buildPhoneGeometryRows(
      [
        {
          fields: [
            {
              key: 'radius',
              label: '半径（真实）',
              sourceKey: 'radius',
              geometryRole: 'real'
            },
            {
              key: 'radius__display',
              label: '半径（显示）',
              sourceKey: 'radius',
              geometryRole: 'display'
            }
          ]
        }
      ],
      {
        radius: 1,
        radius__display: 50
      }
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      sourceKey: 'radius',
      label: '半径',
      realKey: 'radius',
      displayKey: 'radius__display',
      realValue: 1,
      displayValue: 50
    });
  });

  it('ignores incomplete field pairs and keeps source ordering', () => {
    const rows = buildPhoneGeometryRows(
      [
        {
          fields: [
            {
              key: 'width',
              sourceKey: 'width',
              geometryRole: 'real'
            },
            {
              key: 'radius',
              sourceKey: 'radius',
              geometryRole: 'real'
            },
            {
              key: 'radius__display',
              sourceKey: 'radius',
              geometryRole: 'display'
            }
          ]
        }
      ],
      {
        width: 2,
        radius: 3,
        radius__display: 90
      }
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].sourceKey).toBe('radius');
  });
});
