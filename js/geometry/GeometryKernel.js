import {
    buildSegmentsFromVertices,
    normalizeLocalVertices,
    pointInPolygon
} from './VertexGeometry.js';

const DEFAULT_CIRCLE_SEGMENT_COUNT = 24;

function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function isFinitePositive(value) {
    return Number.isFinite(value) && value > 0;
}

function normalizeOrigin(object) {
    const x = Number(object?.x);
    const y = Number(object?.y);
    return {
        x: isFiniteNumber(x) ? x : 0,
        y: isFiniteNumber(y) ? y : 0
    };
}

function normalizePolygon(vertices) {
    const normalized = normalizeLocalVertices(vertices, 3);
    if (!normalized) return null;
    return normalized.map((point) => ({
        x: point.x,
        y: point.y
    }));
}

function computePolygonLocalBounds(vertices) {
    const normalized = normalizePolygon(vertices);
    if (!normalized) return null;
    let minX = normalized[0].x;
    let maxX = normalized[0].x;
    let minY = normalized[0].y;
    let maxY = normalized[0].y;
    for (let i = 1; i < normalized.length; i += 1) {
        const point = normalized[i];
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, maxX, minY, maxY };
}

function normalizeGeometryContract(source) {
    if (!source || typeof source !== 'object') return null;
    const kind = source.kind;
    if (kind === 'circle') {
        const radius = Number(source.radius);
        if (!isFinitePositive(radius)) return null;
        return { kind: 'circle', radius };
    }
    if (kind === 'polygon') {
        const vertices = normalizePolygon(source.vertices);
        if (!vertices) return null;
        return { kind: 'polygon', vertices };
    }
    return null;
}

export function resolveObjectGeometry(object) {
    if (!object || typeof object !== 'object') return null;
    if (typeof object.getGeometry === 'function') {
        const fromMethod = normalizeGeometryContract(object.getGeometry());
        if (fromMethod) return fromMethod;
    }

    const fromProperty = normalizeGeometryContract(object.geometry);
    if (fromProperty) return fromProperty;

    return null;
}

export function getObjectGeometryKind(object) {
    return resolveObjectGeometry(object)?.kind || null;
}

export function getGeometryDisplayDimensions(object) {
    const geometry = resolveObjectGeometry(object);
    if (!geometry) return null;
    if (geometry.kind === 'circle') {
        const radius = geometry.radius;
        return {
            width: radius * 2,
            height: radius * 2,
            radius
        };
    }

    const bounds = computePolygonLocalBounds(geometry.vertices);
    if (!bounds) return null;
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    return {
        width,
        height,
        radius: Math.min(width, height) / 2
    };
}

export function getGeometryCircleBoundary(object) {
    const geometry = resolveObjectGeometry(object);
    if (!geometry || geometry.kind !== 'circle') return null;
    const origin = normalizeOrigin(object);
    return {
        x: origin.x,
        y: origin.y,
        radius: geometry.radius
    };
}

export function getGeometryWorldVertices(object) {
    const geometry = resolveObjectGeometry(object);
    if (!geometry || geometry.kind !== 'polygon') return [];
    const origin = normalizeOrigin(object);
    return geometry.vertices.map((point) => ({
        x: origin.x + point.x,
        y: origin.y + point.y
    }));
}

function buildCircleSegments(circle, segmentCount) {
    const count = Number.isInteger(segmentCount) && segmentCount >= 3
        ? segmentCount
        : DEFAULT_CIRCLE_SEGMENT_COUNT;
    const segments = [];
    for (let i = 0; i < count; i += 1) {
        const fromA = (i / count) * Math.PI * 2;
        const toA = ((i + 1) / count) * Math.PI * 2;
        const x1 = circle.x + Math.cos(fromA) * circle.radius;
        const y1 = circle.y + Math.sin(fromA) * circle.radius;
        const x2 = circle.x + Math.cos(toA) * circle.radius;
        const y2 = circle.y + Math.sin(toA) * circle.radius;
        segments.push({ x1, y1, x2, y2 });
    }
    return segments;
}

export function getGeometryBoundarySegments(object, options = {}) {
    const circle = getGeometryCircleBoundary(object);
    if (circle) {
        return buildCircleSegments(circle, Number(options.circleSegments));
    }
    const worldVertices = getGeometryWorldVertices(object);
    return buildSegmentsFromVertices(worldVertices);
}

export function getGeometryBounds(object) {
    const circle = getGeometryCircleBoundary(object);
    if (circle) {
        return {
            minX: circle.x - circle.radius,
            maxX: circle.x + circle.radius,
            minY: circle.y - circle.radius,
            maxY: circle.y + circle.radius
        };
    }

    const worldVertices = getGeometryWorldVertices(object);
    if (!worldVertices.length) return null;
    let minX = worldVertices[0].x;
    let maxX = worldVertices[0].x;
    let minY = worldVertices[0].y;
    let maxY = worldVertices[0].y;
    for (let i = 1; i < worldVertices.length; i += 1) {
        const point = worldVertices[i];
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, maxX, minY, maxY };
}

export function getGeometryHandles(object) {
    const circle = getGeometryCircleBoundary(object);
    if (circle) {
        return [
            {
                kind: 'radius',
                index: 0,
                x: circle.x + circle.radius,
                y: circle.y
            }
        ];
    }

    const vertices = getGeometryWorldVertices(object);
    return vertices.map((point, index) => ({
        kind: 'vertex',
        index,
        x: point.x,
        y: point.y
    }));
}

export function geometryContainsPoint(object, x, y) {
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) return false;
    const circle = getGeometryCircleBoundary(object);
    if (circle) {
        const dx = x - circle.x;
        const dy = y - circle.y;
        return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
    }

    const vertices = getGeometryWorldVertices(object);
    if (!vertices.length) return false;
    return pointInPolygon(x, y, vertices);
}
