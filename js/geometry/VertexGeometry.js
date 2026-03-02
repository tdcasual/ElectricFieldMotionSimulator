function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function toFinitePoint(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const x = Number(raw.x);
    const y = Number(raw.y);
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
    return { x, y };
}

function normalizePointList(points) {
    if (!Array.isArray(points)) return [];
    const normalized = [];
    for (const point of points) {
        const next = toFinitePoint(point);
        if (!next) continue;
        normalized.push(next);
    }
    return normalized;
}

export function normalizeLocalVertices(vertices, minVertices = 3) {
    const normalized = normalizePointList(vertices);
    if (normalized.length < minVertices) return null;
    return normalized;
}

export function hasLocalVertices(object, minVertices = 3) {
    return !!normalizeLocalVertices(object?.vertices, minVertices);
}

export function getWorldVertices(object, minVertices = 3) {
    const local = normalizeLocalVertices(object?.vertices, minVertices);
    if (!local) return [];
    const baseX = isFiniteNumber(object?.x) ? object.x : 0;
    const baseY = isFiniteNumber(object?.y) ? object.y : 0;
    return local.map((point) => ({
        x: baseX + point.x,
        y: baseY + point.y
    }));
}

export function computeVertexBounds(vertices) {
    const points = normalizePointList(vertices);
    if (!points.length) return null;
    let minX = points[0].x;
    let minY = points[0].y;
    let maxX = points[0].x;
    let maxY = points[0].y;
    for (let i = 1; i < points.length; i += 1) {
        const point = points[i];
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, minY, maxX, maxY };
}

export function normalizeObjectVerticesFromWorld(object, worldVertices, minVertices = 3) {
    if (!object || typeof object !== 'object') return false;
    const points = normalizePointList(worldVertices);
    if (points.length < minVertices) return false;
    const bounds = computeVertexBounds(points);
    if (!bounds) return false;
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    object.x = bounds.minX;
    object.y = bounds.minY;
    object.width = width;
    object.height = height;
    if (Number.isFinite(object.radius)) {
        object.radius = Math.min(width, height) / 2;
    }
    object.vertices = points.map((point) => ({
        x: point.x - bounds.minX,
        y: point.y - bounds.minY
    }));
    return true;
}

export function scaleWorldVerticesToBounds(startState, nextBounds, minVertices = 3) {
    const vertices = normalizeLocalVertices(startState?.vertices, minVertices);
    if (!vertices) return null;
    const startX = Number(startState.x);
    const startY = Number(startState.y);
    const startW = Number(startState.width);
    const startH = Number(startState.height);
    const nextX = Number(nextBounds?.x);
    const nextY = Number(nextBounds?.y);
    const nextW = Number(nextBounds?.width);
    const nextH = Number(nextBounds?.height);
    if (
        !isFiniteNumber(startX) ||
        !isFiniteNumber(startY) ||
        !isFiniteNumber(startW) ||
        !isFiniteNumber(startH) ||
        !isFiniteNumber(nextX) ||
        !isFiniteNumber(nextY) ||
        !isFiniteNumber(nextW) ||
        !isFiniteNumber(nextH)
    ) {
        return null;
    }

    const sx = Math.abs(startW) > 1e-9 ? startW : 1;
    const sy = Math.abs(startH) > 1e-9 ? startH : 1;
    return vertices.map((local) => {
        const worldX = startX + local.x;
        const worldY = startY + local.y;
        const tx = (worldX - startX) / sx;
        const ty = (worldY - startY) / sy;
        return {
            x: nextX + tx * nextW,
            y: nextY + ty * nextH
        };
    });
}

function pointOnSegment(x, y, a, b, epsilon = 1e-6) {
    const cross = (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
    if (Math.abs(cross) > epsilon) return false;
    const dot = (x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y);
    if (dot < -epsilon) return false;
    const lenSq = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
    if (dot - lenSq > epsilon) return false;
    return true;
}

export function pointInPolygon(x, y, vertices) {
    const points = normalizePointList(vertices);
    if (points.length < 3) return false;
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const a = points[i];
        const b = points[j];
        if (pointOnSegment(x, y, a, b)) return true;
        const intersects = ((a.y > y) !== (b.y > y)) &&
            (x < ((b.x - a.x) * (y - a.y)) / ((b.y - a.y) || 1e-9) + a.x);
        if (intersects) inside = !inside;
    }
    return inside;
}

export function buildSegmentsFromVertices(vertices) {
    const points = normalizePointList(vertices);
    if (points.length < 2) return [];
    const segments = [];
    for (let i = 0; i < points.length; i += 1) {
        const from = points[i];
        const to = points[(i + 1) % points.length];
        segments.push({
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y
        });
    }
    return segments;
}
