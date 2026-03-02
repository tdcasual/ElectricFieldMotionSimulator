export function computeRectFromHandle(handle, start, pos, minSize) {
  const startX = start.x;
  const startY = start.y;
  const startW = start.width;
  const startH = start.height;
  const startRight = startX + startW;
  const startBottom = startY + startH;

  if (handle === 'nw') {
    const newX = Math.min(pos.x, startRight - minSize);
    const newY = Math.min(pos.y, startBottom - minSize);
    const newW = Math.max(minSize, startRight - newX);
    const newH = Math.max(minSize, startBottom - newY);
    return { x: newX, y: newY, width: newW, height: newH };
  }
  if (handle === 'ne') {
    const newY = Math.min(pos.y, startBottom - minSize);
    const newW = Math.max(minSize, pos.x - startX);
    const newH = Math.max(minSize, startBottom - newY);
    return { x: startX, y: newY, width: newW, height: newH };
  }
  if (handle === 'sw') {
    const newX = Math.min(pos.x, startRight - minSize);
    const newW = Math.max(minSize, startRight - newX);
    const newH = Math.max(minSize, pos.y - startY);
    return { x: newX, y: startY, width: newW, height: newH };
  }

  const newW = Math.max(minSize, pos.x - startX);
  const newH = Math.max(minSize, pos.y - startY);
  return { x: startX, y: startY, width: newW, height: newH };
}
