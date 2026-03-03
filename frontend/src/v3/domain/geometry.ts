export type ObjectGeometryInput = {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
};

export type CircleGeometry = {
  kind: 'circle';
  centerX: number;
  centerY: number;
  radius: number;
};

export type RectGeometry = {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ObjectRenderGeometry = CircleGeometry | RectGeometry;

export function resolveMagneticRenderRadius(input: ObjectGeometryInput): number {
  return Math.max(input.radius, Math.min(input.width, input.height) / 2);
}

export function resolveObjectRenderGeometry(input: ObjectGeometryInput): ObjectRenderGeometry {
  if (input.type === 'electric-field') {
    return {
      kind: 'rect',
      x: input.x - (input.width / 2),
      y: input.y - (input.height / 2),
      width: input.width,
      height: input.height
    };
  }

  return {
    kind: 'circle',
    centerX: input.x,
    centerY: input.y,
    radius: input.type === 'magnetic-field'
      ? resolveMagneticRenderRadius(input)
      : input.radius
  };
}

export function resolveSelectionPadding(type: string): number {
  return type === 'electric-field' ? 6 : 8;
}

export function resolveObjectSelectionGeometry(
  input: ObjectGeometryInput,
  padding = resolveSelectionPadding(input.type)
): ObjectRenderGeometry {
  const base = resolveObjectRenderGeometry(input);
  if (base.kind === 'circle') {
    return {
      kind: 'circle',
      centerX: base.centerX,
      centerY: base.centerY,
      radius: base.radius + padding
    };
  }

  return {
    kind: 'rect',
    x: base.x - padding,
    y: base.y - padding,
    width: base.width + (padding * 2),
    height: base.height + (padding * 2)
  };
}

export function isPointInGeometry(geometry: ObjectRenderGeometry, x: number, y: number): boolean {
  if (geometry.kind === 'circle') {
    const dx = x - geometry.centerX;
    const dy = y - geometry.centerY;
    return (dx * dx + dy * dy) <= (geometry.radius * geometry.radius);
  }

  return (
    x >= geometry.x &&
    x <= (geometry.x + geometry.width) &&
    y >= geometry.y &&
    y <= (geometry.y + geometry.height)
  );
}

export function hitTestObject(input: ObjectGeometryInput, x: number, y: number): boolean {
  return isPointInGeometry(resolveObjectRenderGeometry(input), x, y);
}

export function hitTestTopmostObjectId(
  objects: ObjectGeometryInput[],
  x: number,
  y: number
): string | null {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const item = objects[i];
    if (hitTestObject(item, x, y)) return item.id;
  }
  return null;
}
