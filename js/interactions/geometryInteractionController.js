import {
    getObjectGeometryScale,
    getObjectRealDimension,
    setObjectDisplayDimension
} from '../modes/GeometryScaling.js';
import { computePointTangencyMatch, computeTangencyMatch } from './TangencyEngine.js';
import {
    computeVertexBounds,
    getWorldVertices,
    hasLocalVertices,
    normalizeObjectVerticesFromWorld,
    scaleWorldVerticesToBounds
} from '../geometry/VertexGeometry.js';
import {
    getGeometryWorldVertices,
    getObjectGeometryKind
} from '../geometry/GeometryKernel.js';
import { computeRectFromHandle } from './geometryResize.js';
import {
    buildTangencyCandidates,
    getObjectCircleBoundary,
    getObjectPointBoundary
} from './tangencyCandidates.js';

const TANGENCY_TOLERANCE_PX = 2;
const MIN_TANGENCY_RADIUS = 15;
const RESIZE_SCALE_DIMENSION_PREFERENCE = [
    'radius',
    'width',
    'height',
    'length',
    'plateDistance',
    'depth',
    'viewGap',
    'spotSize',
    'lineWidth',
    'particleRadius'
];

function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function isMagneticFieldObject(manager, object) {
    return manager?.getInteractionKind?.(object) === 'magnetic-field';
}

export function resolveGeometryOverlaySourceKey(manager, object, preferredKeys = []) {
    if (!manager || !object || typeof object !== 'object') return null;
    const keys = Array.isArray(preferredKeys) ? preferredKeys.filter((key) => typeof key === 'string') : [];
    for (const key of RESIZE_SCALE_DIMENSION_PREFERENCE) {
        if (!keys.includes(key)) {
            keys.push(key);
        }
    }

    for (const key of keys) {
        const displayValue = Number(object[key]);
        const realValue = getObjectRealDimension(object, key, manager.scene);
        if (!Number.isFinite(displayValue) || displayValue <= 0) continue;
        if (!Number.isFinite(realValue) || realValue <= 0) continue;
        return key;
    }
    return null;
}

export function updateGeometryOverlayHint(manager, object, preferredKeys = []) {
    const sourceKey = resolveGeometryOverlaySourceKey(manager, object, preferredKeys);
    if (!sourceKey) {
        manager?.clearGeometryOverlayHint?.();
        return false;
    }

    const displayValue = Number(object[sourceKey]);
    const realValue = getObjectRealDimension(object, sourceKey, manager?.scene);
    const objectScaleRaw = getObjectGeometryScale(object);
    const objectScale = Number.isFinite(objectScaleRaw) && objectScaleRaw > 0 ? objectScaleRaw : 1;
    if (!Number.isFinite(displayValue) || displayValue <= 0) {
        manager?.clearGeometryOverlayHint?.();
        return false;
    }
    if (!Number.isFinite(realValue) || realValue <= 0) {
        manager?.clearGeometryOverlayHint?.();
        return false;
    }

    const interaction = manager?.ensureSceneInteractionState?.();
    if (!interaction) return false;
    interaction.geometryOverlay = {
        objectId: object?.id ?? null,
        sourceKey,
        realValue,
        displayValue,
        objectScale
    };
    manager?.getAppAdapter?.()?.updateUI?.();
    return true;
}

export function syncDisplayResizeScale(manager, object, preferredKeys = []) {
    if (!manager || !object || typeof object !== 'object') return false;
    const keys = Array.isArray(preferredKeys) ? preferredKeys.filter((key) => typeof key === 'string') : [];
    for (const key of RESIZE_SCALE_DIMENSION_PREFERENCE) {
        if (!keys.includes(key)) {
            keys.push(key);
        }
    }

    for (const key of keys) {
        const displayValue = Number(object[key]);
        if (!Number.isFinite(displayValue) || displayValue <= 0) continue;
        if (setObjectDisplayDimension(object, key, displayValue, manager.scene)) {
            return true;
        }
    }
    return false;
}

export function applyTangencySnap(manager, match, mode) {
    if (!manager || !match?.snapTarget || !manager.draggingObject) return;
    if (mode === 'move') {
        if (isFiniteNumber(match.snapTarget.x)) {
            manager.draggingObject.x = match.snapTarget.x;
        }
        if (isFiniteNumber(match.snapTarget.y)) {
            manager.draggingObject.y = match.snapTarget.y;
        }
        return;
    }

    if (mode !== 'resize') return;
    if (!isFiniteNumber(match.snapTarget.radius)) return;
    const snappedRadius = Math.max(MIN_TANGENCY_RADIUS, match.snapTarget.radius);
    if (!setObjectDisplayDimension(manager.draggingObject, 'radius', snappedRadius, manager.scene)) {
        manager.draggingObject.radius = snappedRadius;
        if (manager?.isMagneticResizable?.(manager.draggingObject)) {
            manager.draggingObject.width = snappedRadius * 2;
            manager.draggingObject.height = snappedRadius * 2;
        }
        syncDisplayResizeScale(manager, manager.draggingObject, ['radius']);
    }
}

export function updateTangencyHintAndSnap(manager, eventLike = null) {
    if (!manager || !manager.isDragging || !manager.draggingObject || manager.draggingObject.type === 'particle') {
        manager?.clearTangencyHint?.();
        return;
    }

    const mode = manager.getTangencyMode?.();
    if (!mode) {
        manager.clearTangencyHint?.();
        return;
    }

    const activeCircle = getObjectCircleBoundary(manager.draggingObject);
    const activePoint = activeCircle ? null : getObjectPointBoundary(manager.draggingObject);
    if (!activeCircle && !activePoint) {
        manager.clearTangencyHint?.();
        return;
    }

    const objects = manager.getSceneObjects?.() || [];
    const candidateObjects = activePoint
        ? objects.filter((item) => isMagneticFieldObject(manager, item))
        : objects;
    const candidates = buildTangencyCandidates(candidateObjects, manager.draggingObject);
    const match = activeCircle
        ? computeTangencyMatch(activeCircle, candidates, TANGENCY_TOLERANCE_PX, mode)
        : computePointTangencyMatch(activePoint, candidates, TANGENCY_TOLERANCE_PX);
    if (!match) {
        manager.clearTangencyHint?.();
        return;
    }

    const suppressed = !!eventLike?.altKey;
    if (!suppressed) {
        applyTangencySnap(manager, match, mode);
    }

    const currentCircle = getObjectCircleBoundary(manager.draggingObject) || activeCircle;
    const currentPoint = getObjectPointBoundary(manager.draggingObject) || activePoint;
    const interaction = manager.ensureSceneInteractionState?.();
    if (!interaction) return;
    interaction.tangencyHint = {
        activeObjectId: manager.draggingObject.id ?? null,
        activeType: mode,
        kind: match.kind,
        relation: match.relation,
        errorPx: match.errorPx,
        movementPx: match.movementPx,
        suppressed,
        applied: !suppressed,
        candidate: match.candidate,
        activeCircle: currentCircle,
        activePoint: currentPoint,
        label: match.kind === 'circle-circle'
            ? `相切（${match.relation === 'inner' ? '内切' : '外切'}）`
            : (match.kind === 'point-circle' || match.kind === 'point-segment' || match.kind === 'circle-point'
                ? '边界贴合'
                : '相切')
    };
}

export function isFieldResizable(manager, object) {
    if (!manager || !object) return false;
    const kind = manager.getInteractionKind?.(object);
    return kind === 'magnetic-field' || kind === 'electric-field';
}

export function getObjectResizeMode(object) {
    if (!object) return 'rect';
    if (getObjectGeometryKind(object) === 'circle') return 'radius';
    return 'rect';
}

export function getObjectResizeHandles(manager, object) {
    if (!isFieldResizable(manager, object)) return [];
    const mode = getObjectResizeMode(object);
    const hasExplicitGeometry = object?.geometry && typeof object.geometry === 'object';

    if (mode === 'radius') {
        const circle = getObjectCircleBoundary(object);
        if (!circle) return [];
        return [{ key: 'radius', x: circle.x + circle.radius, y: circle.y }];
    }

    const polygonVertices = hasLocalVertices(object)
        ? getWorldVertices(object)
        : getGeometryWorldVertices(object);
    if (polygonVertices.length) {
        const bounds = computeVertexBounds(polygonVertices);
        if (!bounds) return [];
        return [
            { key: 'nw', x: bounds.minX, y: bounds.minY },
            { key: 'ne', x: bounds.maxX, y: bounds.minY },
            { key: 'sw', x: bounds.minX, y: bounds.maxY },
            { key: 'se', x: bounds.maxX, y: bounds.maxY }
        ];
    }
    if (hasExplicitGeometry) return [];

    const x = Number.isFinite(object?.x) ? object.x : 0;
    const y = Number.isFinite(object?.y) ? object.y : 0;
    const w = Number.isFinite(object?.width) ? object.width : 0;
    const h = Number.isFinite(object?.height) ? object.height : 0;

    return [
        { key: 'nw', x, y },
        { key: 'ne', x: x + w, y },
        { key: 'sw', x, y: y + h },
        { key: 'se', x: x + w, y: y + h }
    ];
}

export function getObjectResizeHandle(manager, object, pos) {
    const handles = getObjectResizeHandles(manager, object);
    const tolerance = manager?.isCoarsePointer ? 18 : 10;
    const tolSq = tolerance * tolerance;
    for (const handle of handles) {
        const dx = pos.x - handle.x;
        const dy = pos.y - handle.y;
        if ((dx * dx + dy * dy) <= tolSq) {
            return handle.key;
        }
    }
    return null;
}

export function captureResizeStart(object) {
    const x = Number.isFinite(object?.x) ? object.x : 0;
    const y = Number.isFinite(object?.y) ? object.y : 0;
    const vertices = (() => {
        if (hasLocalVertices(object)) {
            return object.vertices.map((point) => ({ ...point }));
        }
        const worldVertices = getGeometryWorldVertices(object);
        if (!worldVertices.length) return null;
        return worldVertices.map((point) => ({
            x: point.x - x,
            y: point.y - y
        }));
    })();
    return {
        x,
        y,
        width: Number.isFinite(object?.width) ? object.width : 0,
        height: Number.isFinite(object?.height) ? object.height : 0,
        radius: Number.isFinite(object?.radius) ? object.radius : 0,
        vertices
    };
}

export function tryStartObjectResize(manager, object, pointerPos) {
    if (!manager || !isFieldResizable(manager, object)) return false;
    const handle = getObjectResizeHandle(manager, object, pointerPos);
    if (!handle) return false;
    manager.dragMode = 'resize';
    manager.resizeHandle = handle;
    manager.resizeStart = captureResizeStart(object);
    return true;
}

export function resizeObject(manager, field, pos) {
    if (!manager || !manager.resizeHandle || !manager.resizeStart) return;

    const minSize = 30;
    const minRadius = 15;
    const start = manager.resizeStart;
    const mode = getObjectResizeMode(field);

    if (mode === 'radius') {
        const cx = start.x;
        const cy = start.y;
        const r = Math.max(minRadius, Math.hypot(pos.x - cx, pos.y - cy));
        field.x = cx;
        field.y = cy;
        field.radius = r;
        if (manager?.isMagneticResizable?.(field)) {
            field.width = r * 2;
            field.height = r * 2;
        }
        return;
    }

    if (start.vertices && ['nw', 'ne', 'sw', 'se'].includes(manager.resizeHandle)) {
        const nextRect = computeRectFromHandle(manager.resizeHandle, start, pos, minSize);
        const worldVertices = scaleWorldVerticesToBounds(start, nextRect);
        if (worldVertices) {
            normalizeObjectVerticesFromWorld(field, worldVertices);
            return;
        }
    }

    const setRect = ({ x, y, width, height }) => {
        field.x = x;
        field.y = y;
        field.width = width;
        field.height = height;
        if (manager?.isMagneticResizable?.(field)) {
            field.radius = Math.min(width, height) / 2;
        }
    };

    const nextRect = computeRectFromHandle(manager.resizeHandle, start, pos, minSize);
    setRect(nextRect);
}
