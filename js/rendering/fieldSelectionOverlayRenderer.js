export function buildSelectionHandles({
  vertexModeEnabled,
  circleBoundary,
  polygonVertices,
  polygonBounds,
  fallbackRect
}) {
  if (circleBoundary) {
    return [{ x: circleBoundary.x + circleBoundary.radius, y: circleBoundary.y }];
  }

  if (vertexModeEnabled && Array.isArray(polygonVertices) && polygonVertices.length) {
    return polygonVertices.map((point) => ({ x: point.x, y: point.y }));
  }

  if (polygonBounds) {
    return [
      { x: polygonBounds.minX, y: polygonBounds.minY },
      { x: polygonBounds.maxX, y: polygonBounds.minY },
      { x: polygonBounds.minX, y: polygonBounds.maxY },
      { x: polygonBounds.maxX, y: polygonBounds.maxY }
    ];
  }

  const x = Number.isFinite(fallbackRect?.x) ? fallbackRect.x : 0;
  const y = Number.isFinite(fallbackRect?.y) ? fallbackRect.y : 0;
  const width = Number.isFinite(fallbackRect?.width) ? fallbackRect.width : 0;
  const height = Number.isFinite(fallbackRect?.height) ? fallbackRect.height : 0;
  return [
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height }
  ];
}
