function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function isValidCircle(circle) {
  return !!circle &&
    isFiniteNumber(circle.x) &&
    isFiniteNumber(circle.y) &&
    isFiniteNumber(circle.radius) &&
    circle.radius > 0;
}

function normalizeVector(x, y) {
  const len = Math.hypot(x, y);
  if (len <= 0) return { x: 1, y: 0, length: 0 };
  return { x: x / len, y: y / len, length: len };
}

function clamp01(value) {
  if (!isFiniteNumber(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0) {
    const dist = Math.hypot(px - x1, py - y1);
    return { x: x1, y: y1, distance: dist, t: 0 };
  }

  const t = clamp01(((px - x1) * dx + (py - y1) * dy) / lenSq);
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  return { x: cx, y: cy, distance: Math.hypot(px - cx, py - cy), t };
}

export function distancePointToSegment(px, py, x1, y1, x2, y2) {
  return closestPointOnSegment(px, py, x1, y1, x2, y2).distance;
}

function pickClosestByErrorAndMovement(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return null;
  return [...matches].sort((a, b) => {
    const err = (a.errorPx ?? Infinity) - (b.errorPx ?? Infinity);
    if (err !== 0) return err;
    return (a.movementPx ?? Infinity) - (b.movementPx ?? Infinity);
  })[0] || null;
}

export function evaluateCircleCircleTangency(activeCircle, candidate, tolerance = 2, mode = 'move') {
  if (!isValidCircle(activeCircle)) return null;
  if (!candidate || candidate.kind !== 'circle' || !isValidCircle(candidate)) return null;

  const ax = activeCircle.x;
  const ay = activeCircle.y;
  const ar = activeCircle.radius;
  const bx = candidate.x;
  const by = candidate.y;
  const br = candidate.radius;

  const dir = normalizeVector(ax - bx, ay - by);
  const centerDistance = dir.length;
  const absRadiusDiff = Math.abs(ar - br);
  const outerDistance = ar + br;
  const outerError = Math.abs(centerDistance - outerDistance);
  const innerError = Math.abs(centerDistance - absRadiusDiff);

  if (mode === 'resize') {
    const radiusCandidates = [];

    const outerRadius = centerDistance - br;
    if (outerRadius > 0) {
      radiusCandidates.push({ relation: 'outer', targetRadius: outerRadius });
    }

    const innerRadiusA = Math.abs(br - centerDistance);
    if (innerRadiusA > 0) {
      radiusCandidates.push({ relation: 'inner', targetRadius: innerRadiusA });
    }

    const innerRadiusB = br + centerDistance;
    if (innerRadiusB > 0) {
      radiusCandidates.push({ relation: 'inner', targetRadius: innerRadiusB });
    }

    const resizedMatches = radiusCandidates
      .map((item) => {
        const errorPx = Math.abs(ar - item.targetRadius);
        if (errorPx > tolerance) return null;
        return {
          kind: 'circle-circle',
          relation: item.relation,
          errorPx,
          movementPx: Math.abs(item.targetRadius - ar),
          candidate,
          snapTarget: { radius: item.targetRadius }
        };
      })
      .filter(Boolean);

    return pickClosestByErrorAndMovement(resizedMatches);
  }

  const relation = outerError <= innerError ? 'outer' : 'inner';
  const errorPx = Math.min(outerError, innerError);
  if (errorPx > tolerance) return null;

  const targetDistance = relation === 'outer' ? (ar + br) : Math.abs(ar - br);
  const targetX = bx + dir.x * targetDistance;
  const targetY = by + dir.y * targetDistance;

  return {
    kind: 'circle-circle',
    relation,
    errorPx,
    movementPx: Math.hypot(targetX - ax, targetY - ay),
    candidate,
    snapTarget: { x: targetX, y: targetY, radius: ar }
  };
}

export function evaluateCircleSegmentTangency(activeCircle, candidate, tolerance = 2, mode = 'move') {
  if (!isValidCircle(activeCircle)) return null;
  if (!candidate || candidate.kind !== 'segment') return null;
  if (
    !isFiniteNumber(candidate.x1) ||
    !isFiniteNumber(candidate.y1) ||
    !isFiniteNumber(candidate.x2) ||
    !isFiniteNumber(candidate.y2)
  ) {
    return null;
  }

  const ax = activeCircle.x;
  const ay = activeCircle.y;
  const ar = activeCircle.radius;
  const nearest = closestPointOnSegment(ax, ay, candidate.x1, candidate.y1, candidate.x2, candidate.y2);

  if (mode === 'resize') {
    const targetRadius = nearest.distance;
    if (targetRadius <= 0) return null;
    const errorPx = Math.abs(ar - targetRadius);
    if (errorPx > tolerance) return null;
    return {
      kind: 'circle-segment',
      relation: 'outer',
      errorPx,
      movementPx: Math.abs(targetRadius - ar),
      candidate,
      snapTarget: { radius: targetRadius }
    };
  }

  const errorPx = Math.abs(nearest.distance - ar);
  if (errorPx > tolerance) return null;

  let nx = ax - nearest.x;
  let ny = ay - nearest.y;
  if (nearest.distance <= 0) {
    const segDx = candidate.x2 - candidate.x1;
    const segDy = candidate.y2 - candidate.y1;
    const normal = normalizeVector(-segDy, segDx);
    nx = normal.x;
    ny = normal.y;
  } else {
    const norm = normalizeVector(nx, ny);
    nx = norm.x;
    ny = norm.y;
  }

  const targetX = nearest.x + nx * ar;
  const targetY = nearest.y + ny * ar;

  return {
    kind: 'circle-segment',
    relation: 'outer',
    errorPx,
    movementPx: Math.hypot(targetX - ax, targetY - ay),
    candidate,
    snapTarget: { x: targetX, y: targetY, radius: ar }
  };
}

export function pickBestTangencyMatch(matches) {
  return pickClosestByErrorAndMovement(matches);
}

export function computeTangencyMatch(activeCircle, candidates, tolerance = 2, mode = 'move') {
  if (!isValidCircle(activeCircle)) return null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const matches = [];
  for (const candidate of candidates) {
    if (!candidate || !candidate.kind) continue;
    if (candidate.kind === 'circle') {
      const circleMatch = evaluateCircleCircleTangency(activeCircle, candidate, tolerance, mode);
      if (circleMatch) matches.push(circleMatch);
      continue;
    }
    if (candidate.kind === 'segment') {
      const segmentMatch = evaluateCircleSegmentTangency(activeCircle, candidate, tolerance, mode);
      if (segmentMatch) matches.push(segmentMatch);
    }
  }

  return pickBestTangencyMatch(matches);
}
