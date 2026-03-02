/**
 * 拖拽管理器
 */

import { registry } from '../core/registerObjects.js';
import {
    applyDemoZoomToScene,
    buildDemoCreationOverrides,
    DEMO_BASE_PIXELS_PER_UNIT,
    DEMO_MAX_ZOOM,
    DEMO_MIN_ZOOM,
    isDemoMode
} from '../modes/DemoMode.js';
import {
    ensureObjectGeometryState,
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
import { closeContextMenuUi } from './contextMenuLifecycle.js';

export { buildTangencyCandidates, getObjectCircleBoundary, getObjectPointBoundary };

const TOOL_ALIASES = {
    'electric-field-semicircle': { type: 'semicircle-electric-field' },
    'capacitor': { type: 'parallel-plate-capacitor' },
    'vertical-capacitor': { type: 'vertical-parallel-plate-capacitor' }
};

const CREATION_OVERRIDES = {
    'particle': (pixelsPerMeter) => ({ vx: 50 * pixelsPerMeter, vy: 0 }),
    'electron-gun': (pixelsPerMeter) => ({
        emissionRate: 2,
        emissionSpeed: 200 * pixelsPerMeter
    }),
    'programmable-emitter': (pixelsPerMeter) => ({
        emissionSpeed: 200 * pixelsPerMeter,
        speedMin: 200 * pixelsPerMeter,
        speedMax: 200 * pixelsPerMeter,
        emissionInterval: 0.15
    })
};

const TANGENCY_TOLERANCE_PX = 2;
const MIN_TANGENCY_RADIUS = 15;
const POINTER_DRAG_THRESHOLD_SQ_MOUSE = 1;
const POINTER_DRAG_THRESHOLD_SQ_TOUCH = 64; // 8px jitter tolerance for touch long-press
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
const RESET_TAP_CHAIN_EVENT = 'simulator-reset-tap-chain';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

export function resolveToolEntry(type) {
    return TOOL_ALIASES[type] || { type, overrides: {} };
}

export function getCreationOverrides(type, pixelsPerMeter, options = {}) {
    if (options?.demoMode) return {};
    if (!CREATION_OVERRIDES[type]) return {};
    return CREATION_OVERRIDES[type](pixelsPerMeter);
}

function isFiniteNumber(value) {
    return Number.isFinite(value);
}

function getRegistryInteractionKind(object) {
    if (!object || typeof object !== 'object') return null;
    const type = typeof object.type === 'string' ? object.type : '';
    if (!type) return null;
    return registry.get(type)?.interaction?.kind || null;
}

function isMagneticFieldObject(object) {
    return getRegistryInteractionKind(object) === 'magnetic-field';
}

export function clearTangencyHintState(scene) {
    if (!scene || typeof scene !== 'object') return;
    if (!scene.interaction || typeof scene.interaction !== 'object') {
        scene.interaction = {};
    }
    scene.interaction.tangencyHint = null;
}

export function computePinchDistance(pointA, pointB) {
    if (!pointA || !pointB) return 0;
    if (!Number.isFinite(pointA.x) || !Number.isFinite(pointA.y)) return 0;
    if (!Number.isFinite(pointB.x) || !Number.isFinite(pointB.y)) return 0;
    return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}

export function computeDemoPinchZoom(startZoom, startDistance, currentDistance, options = {}) {
    const min = Number.isFinite(options.min) && options.min > 0 ? options.min : DEMO_MIN_ZOOM;
    const max = Number.isFinite(options.max) && options.max >= min ? options.max : DEMO_MAX_ZOOM;
    const zoom = Number.isFinite(startZoom) && startZoom > 0 ? startZoom : 1;
    if (!Number.isFinite(startDistance) || startDistance <= 0) {
        return clamp(zoom, min, max);
    }
    if (!Number.isFinite(currentDistance) || currentDistance <= 0) {
        return clamp(zoom, min, max);
    }
    const scale = currentDistance / startDistance;
    if (!Number.isFinite(scale) || scale <= 0) {
        return clamp(zoom, min, max);
    }
    return clamp(zoom * scale, min, max);
}

export class DragDropManager {
    constructor(scene, renderer, options = {}) {
        this.scene = scene;
        this.renderer = renderer;
        this.appAdapter = options.appAdapter || null;
        this.cleanupListeners = [];
        this.contextMenuCloseHandler = null;
        this.contextMenuEscapeHandler = null;
        this.contextMenuCloseTimer = null;

        this.draggingObject = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;

        this.activePointerId = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTimer = null;
        this.longPressTriggered = false;
        this.lastTap = { time: 0, objectId: null };

        this.armedToolType = null;
        this.armedToolElement = null;
        this.isCoarsePointer =
            window.matchMedia?.('(pointer: coarse)')?.matches ||
            (navigator.maxTouchPoints ?? 0) > 0;

        this.dragMode = 'move'; // move | resize | vertex
        this.resizeHandle = null;
        this.resizeStart = null;
        this.vertexHandleIndex = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;
        this.touchPoints = new Map();
        this.pinchGesture = null;

        // 允许外部传入 canvas（测试页面或自定义场景）
        this.canvas = options.canvas || document.getElementById('particle-canvas');

        this.init();
    }

    getAppAdapter() {
        return this.appAdapter;
    }

    requestSceneRender(options = {}) {
        const app = this.getAppAdapter();
        if (app?.requestRender && app.scene === this.scene) {
            app.requestRender(options);
            return;
        }

        if (options.invalidateFields !== false) {
            this.renderer?.invalidateFields?.();
        }
        if (options.forceRender || this.scene.isPaused) {
            this.renderer?.render?.(this.scene);
        }
        if (options.updateUI !== false) {
            app?.updateUI?.();
        }
    }

    isInteractionLocked() {
        return this.scene?.settings?.interactionLocked === true || this.scene?.settings?.hostMode === 'view';
    }

    isVertexEditModeEnabled() {
        return this.scene?.settings?.vertexEditMode === true;
    }

    isVertexEditableObject(object) {
        if (!object) return false;
        const geometryKind = getObjectGeometryKind(object);
        if (this.isMagneticResizable(object)) {
            if (geometryKind) return geometryKind === 'polygon';
            return !getObjectCircleBoundary(object);
        }
        if (object.type !== 'electric-field-rect') return false;
        if (geometryKind) return geometryKind === 'polygon';
        return true;
    }

    ensureVertexGeometry(object) {
        if (!this.isVertexEditableObject(object)) return false;
        if (hasLocalVertices(object)) return true;
        const geometryVertices = getGeometryWorldVertices(object);
        if (geometryVertices.length >= 3) {
            return normalizeObjectVerticesFromWorld(object, geometryVertices);
        }
        const worldVertices = [];
        const x = Number.isFinite(object.x) ? object.x : 0;
        const y = Number.isFinite(object.y) ? object.y : 0;
        const w = Number.isFinite(object.width) ? object.width : 0;
        const h = Number.isFinite(object.height) ? object.height : 0;
        worldVertices.push({ x, y });
        worldVertices.push({ x: x + w, y });
        worldVertices.push({ x: x + w, y: y + h });
        worldVertices.push({ x, y: y + h });
        return normalizeObjectVerticesFromWorld(object, worldVertices);
    }

    getObjectVertexHandles(object) {
        if (!this.isVertexEditableObject(object)) return [];
        if (!this.ensureVertexGeometry(object)) return [];
        return getWorldVertices(object);
    }

    getVertexHandleIndex(object, pos) {
        const handles = this.getObjectVertexHandles(object);
        if (!handles.length) return null;
        const tolerance = this.isCoarsePointer ? 16 : 10;
        const tolSq = tolerance * tolerance;
        for (let i = 0; i < handles.length; i += 1) {
            const handle = handles[i];
            const dx = pos.x - handle.x;
            const dy = pos.y - handle.y;
            if ((dx * dx + dy * dy) <= tolSq) {
                return i;
            }
        }
        return null;
    }

    applyVertexDrag(object, index, pos) {
        if (!this.isVertexEditableObject(object)) return;
        if (!Number.isInteger(index) || index < 0) return;
        const worldVertices = this.getObjectVertexHandles(object);
        if (!worldVertices.length || index >= worldVertices.length) return;
        const next = worldVertices.map((point) => ({ ...point }));
        next[index] = { x: pos.x, y: pos.y };
        normalizeObjectVerticesFromWorld(object, next);
    }

    bindEvent(target, type, handler, options = undefined) {
        if (!target?.addEventListener || typeof handler !== 'function') return;
        target.addEventListener(type, handler, options);
        this.cleanupListeners.push(() => {
            target.removeEventListener(type, handler, options);
        });
    }

    clearContextMenuCloseHandler() {
        if (!this.contextMenuCloseHandler) return;
        document.removeEventListener('click', this.contextMenuCloseHandler);
        this.contextMenuCloseHandler = null;
    }

    clearContextMenuEscapeHandler() {
        if (!this.contextMenuEscapeHandler) return;
        document.removeEventListener('keydown', this.contextMenuEscapeHandler);
        this.contextMenuEscapeHandler = null;
    }

    clearContextMenuCloseTimer() {
        if (this.contextMenuCloseTimer == null) return;
        clearTimeout(this.contextMenuCloseTimer);
        this.contextMenuCloseTimer = null;
    }

    dispose() {
        this.clearLongPressTimer();
        this.clearContextMenuCloseTimer();
        this.clearContextMenuCloseHandler();
        this.clearContextMenuEscapeHandler();
        this.clearPointerInteractionState();
        this.clearTangencyHint();
        this.touchPoints?.clear?.();
        this.pinchGesture = null;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.vertexHandleIndex = null;
        if (this.armedToolElement) {
            this.setToolArmedState(this.armedToolElement, false);
        }
        this.armedToolType = null;
        this.armedToolElement = null;
        while (this.cleanupListeners.length) {
            const remove = this.cleanupListeners.pop();
            try {
                remove?.();
            } catch {
                // ignore dispose cleanup failures
            }
        }
    }

    init() {
        if (!this.canvas) {
            console.warn('DragDropManager: canvas not found, skipping canvas event binding.');
            return;
        }

        // 工具栏拖拽事件
        document.querySelectorAll('.tool-item').forEach(item => {
            if (item.getAttribute('aria-pressed') == null) {
                item.setAttribute('aria-pressed', 'false');
            }
            this.bindEvent(item, 'dragstart', (e) => {
                if (!e.dataTransfer) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('component-type', item.dataset.type);
            });

            // 触屏设备：点击工具后，再点击画布放置对象（替代原生拖拽）
            this.bindEvent(item, 'click', (e) => {
                if (!this.isCoarsePointer) return;
                if (this.isInteractionLocked()) return;
                e.preventDefault();
                this.toggleArmedTool(item);
            });
        });

        // Canvas接收拖拽
        this.bindEvent(this.canvas, 'dragover', (e) => {
            e.preventDefault();
            if (!e.dataTransfer) return;
            e.dataTransfer.dropEffect = 'copy';
        });

        this.bindEvent(this.canvas, 'drop', (e) => {
            e.preventDefault();
            if (!e.dataTransfer) return;
            if (this.isInteractionLocked()) return;
            const type = e.dataTransfer.getData('component-type');
            const screen = this.getScreenPos(e);
            const world = this.screenToWorld(screen);

            this.createObject(type, world.x, world.y);
        });

        // Canvas object interactions are pointer-event only.
        this.bindEvent(this.canvas, 'pointerdown', (e) => this.onPointerDown(e));
        this.bindEvent(this.canvas, 'pointermove', (e) => this.onPointerMove(e));
        this.bindEvent(this.canvas, 'pointerup', (e) => this.onPointerUp(e));
        this.bindEvent(this.canvas, 'pointercancel', (e) => this.onPointerCancel(e));

        // 右键菜单
        this.bindEvent(this.canvas, 'contextmenu', (e) => this.onContextMenu(e));
        this.bindEvent(document, 'contextmenu', (e) => {
            const contextMenu = document.getElementById('context-menu');
            if (!contextMenu) return;
            const target = e.target;
            const canvasContainsTarget =
                !!this.canvas &&
                typeof this.canvas.contains === 'function' &&
                target != null &&
                (() => {
                    try {
                        return this.canvas.contains(target);
                    } catch {
                        return false;
                    }
                })();
            if (canvasContainsTarget) return; // Canvas lifecycle is managed by onContextMenu.
            contextMenu.style.display = 'none';
            this.clearContextMenuCloseTimer();
            this.clearContextMenuCloseHandler();
            this.clearContextMenuEscapeHandler();
        });
        this.bindEvent(document, RESET_TAP_CHAIN_EVENT, () => this.resetTapChain());
    }

    createObject(type, x, y) {
        if (this.isInteractionLocked()) {
            this.setStatus('只读模式下无法编辑场景');
            return;
        }
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : 1;
        const demoMode = isDemoMode(this.scene);
        const alias = resolveToolEntry(type);
        const resolvedType = alias.type || type;
        const baseOverrides = { x, y, ...(alias.overrides || {}) };
        const entry = registry.get(resolvedType);
        const demoOverrides = demoMode
            ? buildDemoCreationOverrides(entry, pixelsPerMeter)
            : {};
        const extraOverrides = getCreationOverrides(resolvedType, pixelsPerMeter, { demoMode });
        let object = null;
        try {
            object = registry.create(resolvedType, { ...demoOverrides, ...baseOverrides, ...extraOverrides });
        } catch (error) {
            console.warn('Unknown tool type:', resolvedType, error);
        }

        if (object) {
            this.scene.addObject(object);
            ensureObjectGeometryState(object, this.scene);
            this.requestSceneRender({ invalidateFields: true });
        }
    }

    setStatus(text) {
        const app = this.getAppAdapter();
        if (typeof app?.setStatusText === 'function') {
            app.setStatusText(text);
            return;
        }
        const el = document.getElementById('status-text');
        if (el) el.textContent = text;
    }

    toggleArmedTool(item) {
        if (this.isInteractionLocked()) return;
        const type = item?.dataset?.type;
        if (!type) return;

        if (this.armedToolType === type) {
            this.disarmTool();
        } else {
            this.armTool(type, item);
        }
    }

    setToolArmedState(element, armed) {
        if (!element) return;
        element.classList.toggle('active', !!armed);
        element.setAttribute('aria-pressed', armed ? 'true' : 'false');
    }

    armTool(type, element) {
        if (this.armedToolElement) {
            this.setToolArmedState(this.armedToolElement, false);
        }

        this.armedToolType = type;
        this.armedToolElement = element || null;
        this.setToolArmedState(this.armedToolElement, true);

        const label = element?.title || element?.querySelector?.('span')?.textContent || type;
        this.setStatus(`点击画布放置: ${label}`);
    }

    disarmTool() {
        if (this.armedToolElement) {
            this.setToolArmedState(this.armedToolElement, false);
        }
        this.armedToolType = null;
        this.armedToolElement = null;
        this.setStatus('就绪');
    }

    clearLongPressTimer() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    resetTapChain() {
        this.lastTap = { time: 0, objectId: null };
    }

    openProperties(object) {
        if (!object) return;
        this.getAppAdapter()?.onPropertyRequest?.(object);
    }

    getCameraOffset() {
        const offsetX = Number.isFinite(this.scene?.camera?.offsetX) ? this.scene.camera.offsetX : 0;
        const offsetY = Number.isFinite(this.scene?.camera?.offsetY) ? this.scene.camera.offsetY : 0;
        return { offsetX, offsetY };
    }

    setCameraOffset(offsetX, offsetY) {
        if (typeof this.scene?.setCamera === 'function') {
            this.scene.setCamera(offsetX, offsetY);
            return;
        }
        if (!this.scene.camera || typeof this.scene.camera !== 'object') {
            this.scene.camera = { offsetX: 0, offsetY: 0 };
        }
        this.scene.camera.offsetX = Number.isFinite(offsetX) ? offsetX : 0;
        this.scene.camera.offsetY = Number.isFinite(offsetY) ? offsetY : 0;
    }

    getScreenPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    screenToWorld(pos) {
        if (!pos) return { x: 0, y: 0 };
        if (typeof this.scene?.toWorldPoint === 'function') {
            return this.scene.toWorldPoint(pos.x, pos.y);
        }
        const { offsetX, offsetY } = this.getCameraOffset();
        return { x: pos.x - offsetX, y: pos.y - offsetY };
    }

    panCameraByPointer(screenPos) {
        if (!this.isPanning || !screenPos || !this.panStartScreen || !this.panStartCamera) {
            return;
        }
        const dx = screenPos.x - this.panStartScreen.x;
        const dy = screenPos.y - this.panStartScreen.y;
        this.setCameraOffset(this.panStartCamera.offsetX + dx, this.panStartCamera.offsetY + dy);
    }

    getSceneObjects() {
        if (Array.isArray(this.scene?.objects)) return this.scene.objects;
        if (typeof this.scene?.getAllObjects === 'function') return this.scene.getAllObjects();
        return [];
    }

    ensureSceneInteractionState() {
        if (!this.scene || typeof this.scene !== 'object') return null;
        if (!this.scene.interaction || typeof this.scene.interaction !== 'object') {
            this.scene.interaction = {};
        }
        return this.scene.interaction;
    }

    clearTangencyHint() {
        clearTangencyHintState(this.scene);
    }

    clearGeometryOverlayHint(syncUI = true) {
        const interaction = this.ensureSceneInteractionState();
        if (!interaction) return false;
        if (!interaction.geometryOverlay) return false;
        interaction.geometryOverlay = null;
        if (syncUI) {
            this.getAppAdapter()?.updateUI?.();
        }
        return true;
    }

    resolveGeometryOverlaySourceKey(object, preferredKeys = []) {
        if (!object || typeof object !== 'object') return null;
        const keys = Array.isArray(preferredKeys) ? preferredKeys.filter((key) => typeof key === 'string') : [];
        for (const key of RESIZE_SCALE_DIMENSION_PREFERENCE) {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        }

        for (const key of keys) {
            const displayValue = Number(object[key]);
            const realValue = getObjectRealDimension(object, key, this.scene);
            if (!Number.isFinite(displayValue) || displayValue <= 0) continue;
            if (!Number.isFinite(realValue) || realValue <= 0) continue;
            return key;
        }
        return null;
    }

    updateGeometryOverlayHint(object, preferredKeys = []) {
        const sourceKey = this.resolveGeometryOverlaySourceKey(object, preferredKeys);
        if (!sourceKey) {
            this.clearGeometryOverlayHint();
            return false;
        }

        const displayValue = Number(object[sourceKey]);
        const realValue = getObjectRealDimension(object, sourceKey, this.scene);
        const objectScaleRaw = getObjectGeometryScale(object);
        const objectScale = Number.isFinite(objectScaleRaw) && objectScaleRaw > 0 ? objectScaleRaw : 1;
        if (!Number.isFinite(displayValue) || displayValue <= 0) {
            this.clearGeometryOverlayHint();
            return false;
        }
        if (!Number.isFinite(realValue) || realValue <= 0) {
            this.clearGeometryOverlayHint();
            return false;
        }

        const interaction = this.ensureSceneInteractionState();
        if (!interaction) return false;
        interaction.geometryOverlay = {
            objectId: object?.id ?? null,
            sourceKey,
            realValue,
            displayValue,
            objectScale
        };
        this.getAppAdapter()?.updateUI?.();
        return true;
    }

    getTangencyMode() {
        if (this.dragMode !== 'resize') return 'move';
        return this.resizeHandle === 'radius' ? 'resize' : null;
    }

    syncDisplayResizeScale(object, preferredKeys = []) {
        if (!object || typeof object !== 'object') return false;
        const keys = Array.isArray(preferredKeys) ? preferredKeys.filter((key) => typeof key === 'string') : [];
        for (const key of RESIZE_SCALE_DIMENSION_PREFERENCE) {
            if (!keys.includes(key)) {
                keys.push(key);
            }
        }

        for (const key of keys) {
            const displayValue = Number(object[key]);
            if (!Number.isFinite(displayValue) || displayValue <= 0) continue;
            if (setObjectDisplayDimension(object, key, displayValue, this.scene)) {
                return true;
            }
        }
        return false;
    }

    applyTangencySnap(match, mode) {
        if (!match?.snapTarget || !this.draggingObject) return;
        if (mode === 'move') {
            if (isFiniteNumber(match.snapTarget.x)) {
                this.draggingObject.x = match.snapTarget.x;
            }
            if (isFiniteNumber(match.snapTarget.y)) {
                this.draggingObject.y = match.snapTarget.y;
            }
            return;
        }

        if (mode !== 'resize') return;
        if (!isFiniteNumber(match.snapTarget.radius)) return;
        const snappedRadius = Math.max(MIN_TANGENCY_RADIUS, match.snapTarget.radius);
        if (!setObjectDisplayDimension(this.draggingObject, 'radius', snappedRadius, this.scene)) {
            this.draggingObject.radius = snappedRadius;
            if (this.isMagneticResizable(this.draggingObject)) {
                this.draggingObject.width = snappedRadius * 2;
                this.draggingObject.height = snappedRadius * 2;
            }
            this.syncDisplayResizeScale(this.draggingObject, ['radius']);
        }
    }

    updateTangencyHintAndSnap(eventLike = null) {
        if (!this.isDragging || !this.draggingObject || this.draggingObject.type === 'particle') {
            this.clearTangencyHint();
            return;
        }

        const mode = this.getTangencyMode();
        if (!mode) {
            this.clearTangencyHint();
            return;
        }

        const activeCircle = getObjectCircleBoundary(this.draggingObject);
        const activePoint = activeCircle ? null : getObjectPointBoundary(this.draggingObject);
        if (!activeCircle && !activePoint) {
            this.clearTangencyHint();
            return;
        }

        const objects = this.getSceneObjects();
        const candidateObjects = activePoint
            ? objects.filter((item) => isMagneticFieldObject(item))
            : objects;
        const candidates = buildTangencyCandidates(candidateObjects, this.draggingObject);
        const match = activeCircle
            ? computeTangencyMatch(activeCircle, candidates, TANGENCY_TOLERANCE_PX, mode)
            : computePointTangencyMatch(activePoint, candidates, TANGENCY_TOLERANCE_PX);
        if (!match) {
            this.clearTangencyHint();
            return;
        }

        const suppressed = !!eventLike?.altKey;
        if (!suppressed) {
            this.applyTangencySnap(match, mode);
        }

        const currentCircle = getObjectCircleBoundary(this.draggingObject) || activeCircle;
        const currentPoint = getObjectPointBoundary(this.draggingObject) || activePoint;
        const interaction = this.ensureSceneInteractionState();
        if (!interaction) return;
        interaction.tangencyHint = {
            activeObjectId: this.draggingObject.id ?? null,
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

    isTouchPointerEvent(eventLike) {
        return eventLike?.pointerType !== 'mouse';
    }

    updateTouchPoint(pointerId, screenPos) {
        if (!Number.isFinite(pointerId) || !screenPos) return;
        if (!Number.isFinite(screenPos.x) || !Number.isFinite(screenPos.y)) return;
        this.touchPoints.set(pointerId, { x: screenPos.x, y: screenPos.y });
    }

    getPinchPoints() {
        if (!(this.touchPoints instanceof Map) || this.touchPoints.size < 2) return null;
        const points = Array.from(this.touchPoints.values());
        if (points.length < 2) return null;
        return [points[0], points[1]];
    }

    getCurrentDemoZoom() {
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : DEMO_BASE_PIXELS_PER_UNIT;
        return pixelsPerMeter / DEMO_BASE_PIXELS_PER_UNIT;
    }

    clearPointerInteractionState() {
        this.clearLongPressTimer();
        this.isDragging = false;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTriggered = false;
        this.clearTangencyHint();
        this.clearGeometryOverlayHint();
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.vertexHandleIndex = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;
        if (this.activePointerId != null) {
            this.canvas?.releasePointerCapture?.(this.activePointerId);
        }
        this.activePointerId = null;
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
    }

    beginPinchGesture() {
        const points = this.getPinchPoints();
        if (!points) return false;
        const startDistance = computePinchDistance(points[0], points[1]);
        if (!Number.isFinite(startDistance) || startDistance <= 0) return false;
        this.pinchGesture = {
            startDistance,
            startZoom: this.getCurrentDemoZoom()
        };
        this.resetTapChain();
        this.clearPointerInteractionState();
        return true;
    }

    applyPinchGesture() {
        const points = this.getPinchPoints();
        if (!points) return false;
        if (!this.pinchGesture) {
            return this.beginPinchGesture();
        }

        const distance = computePinchDistance(points[0], points[1]);
        const nextZoom = computeDemoPinchZoom(
            this.pinchGesture.startZoom,
            this.pinchGesture.startDistance,
            distance,
            { min: DEMO_MIN_ZOOM, max: DEMO_MAX_ZOOM }
        );
        const nextPixelsPerMeter = DEMO_BASE_PIXELS_PER_UNIT * nextZoom;
        const midpoint = {
            x: (points[0].x + points[1].x) / 2,
            y: (points[0].y + points[1].y) / 2
        };
        const anchor = this.screenToWorld(midpoint);
        const changed = applyDemoZoomToScene(this.scene, {
            newPixelsPerMeter: nextPixelsPerMeter,
            anchorX: anchor.x,
            anchorY: anchor.y
        });
        if (isDemoMode(this.scene)) {
            this.scene.settings.gravity = 0;
        }
        if (!changed) return true;
        this.requestSceneRender({ invalidateFields: true, updateUI: true });
        return true;
    }

    onPointerDown(e) {
        if (!this.canvas) return;
        if (this.isTouchPointerEvent(e)) {
            this.updateTouchPoint(e.pointerId, this.getScreenPos(e));
            if (this.touchPoints.size >= 2 && !this.isInteractionLocked()) {
                this.beginPinchGesture();
                return;
            }
        }
        if (this.activePointerId !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this.isInteractionLocked()) return;

        this.clearTangencyHint();

        this.activePointerId = e.pointerId;
        this.longPressTriggered = false;
        const screenPos = this.getScreenPos(e);
        this.pointerDownPos = this.screenToWorld(screenPos);

        this.canvas.setPointerCapture?.(e.pointerId);

        // 触屏放置模式：点击空白处放置已选工具
        if (this.armedToolType) {
            const objAt = this.scene.findObjectAt(this.pointerDownPos.x, this.pointerDownPos.y);
            if (!objAt) {
                this.createObject(this.armedToolType, this.pointerDownPos.x, this.pointerDownPos.y);
                this.disarmTool();

                this.canvas.releasePointerCapture?.(e.pointerId);
                this.activePointerId = null;
                this.pointerDownPos = null;
                return;
            }
            // 点到现有对象则取消放置，转为选择/拖拽
            this.disarmTool();
        }

        const prevSelectedObject = this.scene.selectedObject;
        const clickedObject = this.scene.findObjectAt(this.pointerDownPos.x, this.pointerDownPos.y);
        this.pointerDownObject = clickedObject;

        if (clickedObject) {
            this.isPanning = false;
            this.panStartScreen = null;
            this.panStartCamera = null;
            this.draggingObject = clickedObject;
            this.scene.selectedObject = clickedObject;
            ensureObjectGeometryState(clickedObject, this.scene);
            this.isDragging = false;
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;
            this.vertexHandleIndex = null;

            if (this.isVertexEditModeEnabled() && this.isVertexEditableObject(clickedObject)) {
                const vertexIndex = this.getVertexHandleIndex(clickedObject, this.pointerDownPos);
                if (vertexIndex !== null) {
                    this.dragMode = 'vertex';
                    this.vertexHandleIndex = vertexIndex;
                }
            }

            if (this.dragMode === 'move' && !this.isVertexEditModeEnabled()) {
                this.tryStartObjectResize(clickedObject, this.pointerDownPos);
            }

            if (clickedObject.type === 'particle') {
                clickedObject.stuckToCapacitor = false;
                this.dragOffset = {
                    x: this.pointerDownPos.x - clickedObject.position.x,
                    y: this.pointerDownPos.y - clickedObject.position.y
                };
                this.dragMode = 'move';
            } else if (this.dragMode === 'move') {
                this.dragOffset = {
                    x: this.pointerDownPos.x - clickedObject.x,
                    y: this.pointerDownPos.y - clickedObject.y
                };
            }

            if (e.pointerType === 'mouse') {
                if (this.dragMode === 'resize') {
                    this.canvas.style.cursor = 'nwse-resize';
                } else if (this.dragMode === 'vertex') {
                    this.canvas.style.cursor = 'crosshair';
                } else {
                    this.canvas.style.cursor = 'grabbing';
                }
            }

            // 触屏长按打开属性面板
            if (e.pointerType !== 'mouse' && this.dragMode !== 'vertex') {
                this.clearLongPressTimer();
                this.longPressTimer = setTimeout(() => {
                    if (this.pointerDownObject === clickedObject && !this.isDragging) {
                        this.longPressTriggered = true;
                        this.openProperties(clickedObject);
                        this.draggingObject = null;
                        this.isDragging = false;
                        this.canvas.style.cursor = 'default';
                    }
                }, 550);
            }
        } else {
            this.draggingObject = null;
            this.scene.selectedObject = null;
            this.isDragging = false;
            this.clearTangencyHint();
            this.clearLongPressTimer();
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;
            this.vertexHandleIndex = null;
            this.isPanning = true;
            this.panStartScreen = screenPos;
            this.panStartCamera = this.getCameraOffset();
            if (e.pointerType === 'mouse') {
                this.canvas.style.cursor = 'grabbing';
            }
        }

        if (prevSelectedObject !== this.scene.selectedObject) {
            this.requestSceneRender({ invalidateFields: true, updateUI: true });
        }
    }

    onPointerMove(e) {
        if (this.isTouchPointerEvent(e) && this.touchPoints.has(e.pointerId)) {
            this.updateTouchPoint(e.pointerId, this.getScreenPos(e));
            if (this.touchPoints.size >= 2) {
                if (this.isInteractionLocked()) {
                    return;
                }
                this.applyPinchGesture();
                return;
            }
        }
        if (this.activePointerId !== e.pointerId) return;
        const screenPos = this.getScreenPos(e);
        const thresholdSq = e.pointerType === 'mouse'
            ? POINTER_DRAG_THRESHOLD_SQ_MOUSE
            : POINTER_DRAG_THRESHOLD_SQ_TOUCH;

        if (this.isPanning && this.panStartScreen) {
            const dx = screenPos.x - this.panStartScreen.x;
            const dy = screenPos.y - this.panStartScreen.y;

            if (!this.isDragging) {
                if ((dx * dx + dy * dy) < thresholdSq) return;
                this.isDragging = true;
                this.clearLongPressTimer();
            }

            this.panCameraByPointer(screenPos);
            this.renderer.invalidateFields();
            if (this.scene.isPaused) {
                this.renderer.render(this.scene);
            }
            return;
        }

        if (!this.draggingObject || !this.pointerDownPos) return;

        const pos = this.screenToWorld(screenPos);
        const dx = pos.x - this.pointerDownPos.x;
        const dy = pos.y - this.pointerDownPos.y;

        if (!this.isDragging) {
            if ((dx * dx + dy * dy) < thresholdSq) return;
            this.isDragging = true;
            this.clearLongPressTimer();
        }

        if (this.dragMode === 'vertex') {
            this.clearGeometryOverlayHint();
            if (this.vertexHandleIndex !== null) {
                this.applyVertexDrag(this.draggingObject, this.vertexHandleIndex, pos);
                this.renderer.invalidateFields();
            }
        } else if (this.dragMode === 'resize') {
            if (this.isFieldResizable(this.draggingObject)) {
                this.resizeObject(this.draggingObject, pos);
                const preferred = this.resizeHandle === 'radius' ? ['radius'] : ['width', 'height'];
                this.syncDisplayResizeScale(this.draggingObject, preferred);
                this.updateGeometryOverlayHint(this.draggingObject, preferred);
                this.renderer.invalidateFields();
            }
        } else if (this.draggingObject.type === 'particle') {
            this.clearGeometryOverlayHint();
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            this.draggingObject.clearTrajectory();
            if (this.removeParticleIfInDisappearZone(this.draggingObject)) {
                this.clearTangencyHint();
                this.clearGeometryOverlayHint();
                this.draggingObject = null;
                this.isDragging = false;
                this.pointerDownObject = null;
                this.canvas.style.cursor = 'default';
                this.canvas.releasePointerCapture?.(e.pointerId);
                this.activePointerId = null;
                return;
            }
        } else {
            this.clearGeometryOverlayHint();
            this.draggingObject.x = pos.x - this.dragOffset.x;
            this.draggingObject.y = pos.y - this.dragOffset.y;
            this.renderer.invalidateFields();
        }

        if (this.dragMode !== 'vertex') {
            this.updateTangencyHintAndSnap(e);
        }

        if (this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
    }

    onPointerUp(e) {
        if (this.isTouchPointerEvent(e)) {
            this.touchPoints.delete(e.pointerId);
            if (this.touchPoints.size < 2) {
                this.pinchGesture = null;
            }
            if (this.activePointerId === null) {
                return;
            }
        }
        if (this.activePointerId !== e.pointerId) return;

        const tappedObject = this.pointerDownObject;
        const wasDragging = this.isDragging;
        const shouldHandleTap = !this.isInteractionLocked() && !wasDragging && tappedObject && !this.longPressTriggered && e.pointerType !== 'mouse';

        this.clearLongPressTimer();

        if (shouldHandleTap) {
            const now = performance.now();
            if (this.lastTap.objectId === tappedObject.id && (now - this.lastTap.time) < 350) {
                this.openProperties(tappedObject);
                this.resetTapChain();
            } else {
                this.lastTap = { time: now, objectId: tappedObject.id };
            }
        } else if (!tappedObject || wasDragging || this.longPressTriggered) {
            this.resetTapChain();
        }

        this.isDragging = false;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTriggered = false;
        this.clearTangencyHint();
        this.clearGeometryOverlayHint();
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.vertexHandleIndex = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;

        if (e.pointerType === 'mouse') {
            this.canvas.style.cursor = 'default';
        }

        this.canvas.releasePointerCapture?.(e.pointerId);
        this.activePointerId = null;
    }

    onPointerCancel(e) {
        if (this.isTouchPointerEvent(e)) {
            this.touchPoints.delete(e.pointerId);
            if (this.touchPoints.size < 2) {
                this.pinchGesture = null;
            }
            if (this.activePointerId === null) {
                return;
            }
        }
        if (this.activePointerId !== e.pointerId) return;
        this.clearLongPressTimer();
        this.isDragging = false;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTriggered = false;
        this.resetTapChain();
        this.clearTangencyHint();
        this.clearGeometryOverlayHint();
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.vertexHandleIndex = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;
        this.canvas.releasePointerCapture?.(e.pointerId);
        this.activePointerId = null;
        this.canvas.style.cursor = 'default';
    }

    getMousePos(e) {
        const screen = this.getScreenPos(e);
        return this.screenToWorld(screen);
    }

    getInteractionKind(object) {
        return getRegistryInteractionKind(object);
    }

    isMagneticResizable(object) {
        return this.getInteractionKind(object) === 'magnetic-field';
    }

    isElectricResizable(object) {
        return this.getInteractionKind(object) === 'electric-field';
    }

    isFieldResizable(object) {
        if (!object) return false;
        const kind = this.getInteractionKind(object);
        return kind === 'magnetic-field' || kind === 'electric-field';
    }

    getObjectResizeMode(object) {
        if (!object) return 'rect';
        if (getObjectGeometryKind(object) === 'circle') return 'radius';
        return 'rect';
    }

    getObjectResizeHandles(object) {
        if (!this.isFieldResizable(object)) return [];
        const mode = this.getObjectResizeMode(object);
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

    getObjectResizeHandle(object, pos) {
        const handles = this.getObjectResizeHandles(object);
        const tolerance = this.isCoarsePointer ? 18 : 10;
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

    captureResizeStart(object) {
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

    tryStartObjectResize(object, pointerPos) {
        if (!this.isFieldResizable(object)) return false;
        const handle = this.getObjectResizeHandle(object, pointerPos);
        if (!handle) return false;
        this.dragMode = 'resize';
        this.resizeHandle = handle;
        this.resizeStart = this.captureResizeStart(object);
        return true;
    }

    resizeObject(field, pos) {
        if (!this.resizeHandle || !this.resizeStart) return;

        const minSize = 30;
        const minRadius = 15;
        const start = this.resizeStart;
        const mode = this.getObjectResizeMode(field);

        if (mode === 'radius') {
            const cx = start.x;
            const cy = start.y;
            const r = Math.max(minRadius, Math.hypot(pos.x - cx, pos.y - cy));
            field.x = cx;
            field.y = cy;
            field.radius = r;
            if (this.isMagneticResizable(field)) {
                field.width = r * 2;
                field.height = r * 2;
            }
            return;
        }

        if (start.vertices && ['nw', 'ne', 'sw', 'se'].includes(this.resizeHandle)) {
            const nextRect = computeRectFromHandle(this.resizeHandle, start, pos, minSize);
            const worldVertices = scaleWorldVerticesToBounds(start, nextRect);
            if (worldVertices) {
                normalizeObjectVerticesFromWorld(field, worldVertices);
                return;
            }
        }

        const startX = start.x;
        const startY = start.y;
        const startW = start.width;
        const startH = start.height;
        const startRight = startX + startW;
        const startBottom = startY + startH;

        const setRect = ({ x, y, width, height }) => {
            field.x = x;
            field.y = y;
            field.width = width;
            field.height = height;
            if (this.isMagneticResizable(field)) {
                field.radius = Math.min(width, height) / 2;
            }
        };

        const nextRect = computeRectFromHandle(this.resizeHandle, start, pos, minSize);
        setRect(nextRect);
    }

    removeParticleIfInDisappearZone(particle) {
        if (!particle || particle.type !== 'particle') return false;
        const zones = this.scene?.disappearZones;
        if (!zones || !zones.length) return false;

        const px = particle.position?.x ?? particle.x ?? 0;
        const py = particle.position?.y ?? particle.y ?? 0;

        for (const zone of zones) {
            if (!zone || zone.type !== 'disappear-zone') continue;
            const length = Number.isFinite(zone.length) ? zone.length : 0;
            if (length <= 0) continue;
            const angle = (Number.isFinite(zone.angle) ? zone.angle : 0) * Math.PI / 180;
            const dx = Math.cos(angle) * (length / 2);
            const dy = Math.sin(angle) * (length / 2);
            const x1 = zone.x - dx;
            const y1 = zone.y - dy;
            const x2 = zone.x + dx;
            const y2 = zone.y + dy;

            const lineWidth = Number.isFinite(zone.lineWidth) ? zone.lineWidth : 6;
            const threshold = lineWidth / 2;

            const abx = x2 - x1;
            const aby = y2 - y1;
            const apx = px - x1;
            const apy = py - y1;
            const abLenSq = abx * abx + aby * aby;
            let t = 0;
            if (abLenSq > 0) {
                t = (apx * abx + apy * aby) / abLenSq;
                t = Math.max(0, Math.min(1, t));
            }
            const cx = x1 + abx * t;
            const cy = y1 + aby * t;
            const dist = Math.hypot(px - cx, py - cy);
            if (dist <= threshold) {
                this.scene.removeObject(particle);
                const app = this.getAppAdapter();
                if (this.scene.selectedObject === particle) {
                    this.scene.selectedObject = null;
                    app?.propertyPanel?.hide?.();
                }
                this.requestSceneRender({ invalidateFields: true, updateUI: false });
                return true;
            }
        }
        return false;
    }

    onContextMenu(e) {
        e.preventDefault();
        if (this.isInteractionLocked()) return;
        const fromTouch = e.sourceCapabilities?.firesTouchEvents === true;
        if (fromTouch) return;

        const isRightClick =
            (typeof e.button === 'number' && e.button === 2) ||
            (typeof e.which === 'number' && e.which === 3) ||
            (e.ctrlKey && typeof e.button === 'number' && e.button === 0);
        if (this.isCoarsePointer && !isRightClick) return;

        const pos = this.getMousePos(e);
        const prevSelectedObject = this.scene.selectedObject;
        const clickedObject = this.scene.findObjectAt(pos.x, pos.y);
        const contextMenu = document.getElementById('context-menu');

        if (!clickedObject) {
            closeContextMenuUi(contextMenu, () => {
                this.clearContextMenuCloseTimer();
                this.clearContextMenuCloseHandler();
                this.clearContextMenuEscapeHandler();
            });
            return;
        }

        this.scene.selectedObject = clickedObject;

        if (prevSelectedObject !== this.scene.selectedObject) {
            this.requestSceneRender({ invalidateFields: true, updateUI: true });
        }

        // 显示右键菜单
        if (!contextMenu) return;
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        contextMenu.style.display = 'block';
        this.clearContextMenuCloseTimer();
        this.clearContextMenuCloseHandler();
        this.clearContextMenuEscapeHandler();

        const closeMenu = () => {
            closeContextMenuUi(contextMenu, () => {
                this.clearContextMenuCloseTimer();
                this.clearContextMenuCloseHandler();
                this.clearContextMenuEscapeHandler();
            });
        };
        const closeMenuOnEscape = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeMenu();
        };
        this.contextMenuEscapeHandler = closeMenuOnEscape;
        document.addEventListener('keydown', closeMenuOnEscape);

        // 点击外部关闭菜单
        this.contextMenuCloseTimer = setTimeout(() => {
            this.contextMenuCloseTimer = null;
            this.contextMenuCloseHandler = closeMenu;
            document.addEventListener('click', closeMenu);
        }, 0);
    }
}
