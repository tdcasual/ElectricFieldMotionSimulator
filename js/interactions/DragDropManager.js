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
    'particleRadius',
    'barrelLength'
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

function isFinitePositive(value) {
    return Number.isFinite(value) && value > 0;
}

function buildRectSegments(object) {
    const x = object?.x;
    const y = object?.y;
    const w = object?.width;
    const h = object?.height;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFinitePositive(w) || !isFinitePositive(h)) {
        return [];
    }

    return [
        { x1: x, y1: y, x2: x + w, y2: y },
        { x1: x + w, y1: y, x2: x + w, y2: y + h },
        { x1: x + w, y1: y + h, x2: x, y2: y + h },
        { x1: x, y1: y + h, x2: x, y2: y }
    ];
}

function buildTriangleSegments(object) {
    const x = object?.x;
    const y = object?.y;
    const w = object?.width;
    const h = object?.height;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFinitePositive(w) || !isFinitePositive(h)) {
        return [];
    }

    const ax = x + w / 2;
    const ay = y;
    const bx = x;
    const by = y + h;
    const cx = x + w;
    const cy = y + h;
    return [
        { x1: ax, y1: ay, x2: bx, y2: by },
        { x1: bx, y1: by, x2: cx, y2: cy },
        { x1: cx, y1: cy, x2: ax, y2: ay }
    ];
}

function buildDisappearZoneSegment(object) {
    if (object?.type !== 'disappear-zone') return null;
    const length = object.length;
    const angle = object.angle;
    if (!isFinitePositive(length) || !isFiniteNumber(angle) || !isFiniteNumber(object.x) || !isFiniteNumber(object.y)) {
        return null;
    }

    const rad = angle * Math.PI / 180;
    const half = length / 2;
    const dx = Math.cos(rad) * half;
    const dy = Math.sin(rad) * half;
    return { x1: object.x - dx, y1: object.y - dy, x2: object.x + dx, y2: object.y + dy };
}

export function getObjectCircleBoundary(object) {
    if (!object) return null;
    const isElectricCircle = object.type === 'electric-field-circle';
    const isMagneticCircle = object.type?.includes('magnetic-field') && (object.shape || 'rect') === 'circle';
    if (!isElectricCircle && !isMagneticCircle) return null;
    if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y) || !isFinitePositive(object.radius)) {
        return null;
    }
    return { x: object.x, y: object.y, radius: object.radius };
}

export function getObjectPointBoundary(object) {
    if (!object) return null;
    const isEmitter = object.type === 'electron-gun' || object.type === 'programmable-emitter';
    if (!isEmitter) return null;
    if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y)) return null;
    return { x: object.x, y: object.y };
}

function isMagneticFieldObject(object) {
    if (!object) return false;
    if (object.type?.includes('magnetic-field')) return true;
    return registry.get(object.type)?.interaction?.kind === 'magnetic-field';
}

function objectBoundarySegments(object) {
    if (!object) return [];
    if (object.type === 'electric-field-rect') {
        return buildRectSegments(object);
    }

    if (object.type?.includes('magnetic-field')) {
        const shape = object.shape || 'rect';
        if (shape === 'rect') return buildRectSegments(object);
        if (shape === 'triangle') return buildTriangleSegments(object);
    }

    const zoneSegment = buildDisappearZoneSegment(object);
    if (zoneSegment) return [zoneSegment];
    return [];
}

export function buildTangencyCandidates(objects, activeObject) {
    if (!Array.isArray(objects)) return [];
    const candidates = [];
    for (const object of objects) {
        if (!object) continue;
        if (object === activeObject) continue;
        if (activeObject?.id && object?.id && object.id === activeObject.id) continue;

        const circle = getObjectCircleBoundary(object);
        if (circle) {
            candidates.push({
                kind: 'circle',
                x: circle.x,
                y: circle.y,
                radius: circle.radius,
                objectId: object.id ?? null,
                objectRef: object
            });
            continue;
        }

        const point = getObjectPointBoundary(object);
        if (point) {
            candidates.push({
                kind: 'point',
                x: point.x,
                y: point.y,
                objectId: object.id ?? null,
                objectRef: object
            });
            continue;
        }

        const segments = objectBoundarySegments(object);
        for (const segment of segments) {
            candidates.push({
                kind: 'segment',
                x1: segment.x1,
                y1: segment.y1,
                x2: segment.x2,
                y2: segment.y2,
                objectId: object.id ?? null,
                objectRef: object
            });
        }
    }
    return candidates;
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

        this.dragMode = 'move'; // move | resize
        this.resizeHandle = null;
        this.resizeStart = null;
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
        if (this.appAdapter) return this.appAdapter;
        return window.app || null;
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

    clearContextMenuCloseTimer() {
        if (this.contextMenuCloseTimer == null) return;
        clearTimeout(this.contextMenuCloseTimer);
        this.contextMenuCloseTimer = null;
    }

    dispose() {
        this.clearLongPressTimer();
        this.clearContextMenuCloseTimer();
        this.clearContextMenuCloseHandler();
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

        // Canvas内对象拖拽（Pointer Events 优先，兼容触屏）
        if (window.PointerEvent) {
            this.bindEvent(this.canvas, 'pointerdown', (e) => this.onPointerDown(e));
            this.bindEvent(this.canvas, 'pointermove', (e) => this.onPointerMove(e));
            this.bindEvent(this.canvas, 'pointerup', (e) => this.onPointerUp(e));
            this.bindEvent(this.canvas, 'pointercancel', (e) => this.onPointerCancel(e));
        } else {
            this.bindEvent(this.canvas, 'mousedown', (e) => this.onMouseDown(e));
            this.bindEvent(this.canvas, 'mousemove', (e) => this.onMouseMove(e));
            this.bindEvent(this.canvas, 'mouseup', (e) => this.onMouseUp(e));
        }

        // 右键菜单
        this.bindEvent(this.canvas, 'contextmenu', (e) => this.onContextMenu(e));
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
        const event = new CustomEvent('show-properties', {
            detail: { object }
        });
        document.dispatchEvent(event);
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

            if (this.isMagneticResizable(clickedObject)) {
                const handle = this.getMagneticResizeHandle(clickedObject, this.pointerDownPos);
                if (handle) {
                    this.dragMode = 'resize';
                    this.resizeHandle = handle;
                    this.resizeStart = {
                        x: clickedObject.x,
                        y: clickedObject.y,
                        width: clickedObject.width ?? 0,
                        height: clickedObject.height ?? 0,
                        radius: clickedObject.radius ?? 0,
                        shape: clickedObject.shape || 'rect'
                    };
                }
            }

            if (this.dragMode === 'move' && this.isElectricResizable(clickedObject)) {
                const handle = this.getElectricResizeHandle(clickedObject, this.pointerDownPos);
                if (handle) {
                    this.dragMode = 'resize';
                    this.resizeHandle = handle;
                    this.resizeStart = {
                        x: clickedObject.x,
                        y: clickedObject.y,
                        width: clickedObject.width ?? 0,
                        height: clickedObject.height ?? 0,
                        radius: clickedObject.radius ?? 0,
                        type: clickedObject.type
                    };
                }
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
                this.canvas.style.cursor = this.dragMode === 'resize' ? 'nwse-resize' : 'grabbing';
            }

            // 触屏长按打开属性面板
            if (e.pointerType !== 'mouse') {
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

        if (this.dragMode === 'resize') {
            if (this.isMagneticResizable(this.draggingObject)) {
                this.resizeMagneticField(this.draggingObject, pos);
                const preferred = this.resizeHandle === 'radius' ? ['radius'] : ['width', 'height'];
                this.syncDisplayResizeScale(this.draggingObject, preferred);
                this.updateGeometryOverlayHint(this.draggingObject, preferred);
                this.renderer.invalidateFields();
            } else if (this.isElectricResizable(this.draggingObject)) {
                this.resizeElectricField(this.draggingObject, pos);
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

        this.updateTangencyHintAndSnap(e);

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

    onMouseDown(e) {
        if (e.button !== 0) return; // 只处理左键
        if (this.isInteractionLocked()) return;
        this.clearTangencyHint();

        const screenPos = this.getScreenPos(e);
        const pos = this.screenToWorld(screenPos);
        this.pointerDownPos = pos;
        const prevSelectedObject = this.scene.selectedObject;
        const clickedObject = this.scene.findObjectAt(pos.x, pos.y);

        if (clickedObject) {
            this.isPanning = false;
            this.panStartScreen = null;
            this.panStartCamera = null;
            this.draggingObject = clickedObject;
            this.scene.selectedObject = clickedObject;
            ensureObjectGeometryState(clickedObject, this.scene);
            this.isDragging = true;
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;

            if (this.isMagneticResizable(clickedObject)) {
                const handle = this.getMagneticResizeHandle(clickedObject, pos);
                if (handle) {
                    this.dragMode = 'resize';
                    this.resizeHandle = handle;
                    this.resizeStart = {
                        x: clickedObject.x,
                        y: clickedObject.y,
                        width: clickedObject.width ?? 0,
                        height: clickedObject.height ?? 0,
                        radius: clickedObject.radius ?? 0,
                        shape: clickedObject.shape || 'rect'
                    };
                }
            }

            if (this.dragMode === 'move' && this.isElectricResizable(clickedObject)) {
                const handle = this.getElectricResizeHandle(clickedObject, pos);
                if (handle) {
                    this.dragMode = 'resize';
                    this.resizeHandle = handle;
                    this.resizeStart = {
                        x: clickedObject.x,
                        y: clickedObject.y,
                        width: clickedObject.width ?? 0,
                        height: clickedObject.height ?? 0,
                        radius: clickedObject.radius ?? 0,
                        type: clickedObject.type
                    };
                }
            }

            if (clickedObject.type === 'particle') {
                // 解除贴板状态以允许重新拖动
                clickedObject.stuckToCapacitor = false;
                this.dragOffset = {
                    x: pos.x - clickedObject.position.x,
                    y: pos.y - clickedObject.position.y
                };
                this.dragMode = 'move';
            } else if (this.dragMode === 'move') {
                this.dragOffset = {
                    x: pos.x - clickedObject.x,
                    y: pos.y - clickedObject.y
                };
            }

            this.canvas.style.cursor = this.dragMode === 'resize' ? 'nwse-resize' : 'grabbing';
        } else {
            this.scene.selectedObject = null;
            this.draggingObject = null;
            this.isDragging = true;
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;
            this.isPanning = true;
            this.panStartScreen = screenPos;
            this.panStartCamera = this.getCameraOffset();
            this.canvas.style.cursor = 'grabbing';
        }

        if (prevSelectedObject !== this.scene.selectedObject) {
            this.requestSceneRender({ invalidateFields: true, updateUI: true });
        }
    }

    onMouseMove(e) {
        if (this.isPanning && this.panStartScreen) {
            const screenPos = this.getScreenPos(e);
            this.panCameraByPointer(screenPos);
            this.renderer.invalidateFields();
            if (this.scene.isPaused) {
                this.renderer.render(this.scene);
            }
            return;
        }

        if (!this.isDragging || !this.draggingObject) return;

        const pos = this.getMousePos(e);

        if (this.dragMode === 'resize') {
            if (this.isMagneticResizable(this.draggingObject)) {
                this.resizeMagneticField(this.draggingObject, pos);
                const preferred = this.resizeHandle === 'radius' ? ['radius'] : ['width', 'height'];
                this.syncDisplayResizeScale(this.draggingObject, preferred);
                this.updateGeometryOverlayHint(this.draggingObject, preferred);
                this.renderer.invalidateFields();
            } else if (this.isElectricResizable(this.draggingObject)) {
                this.resizeElectricField(this.draggingObject, pos);
                const preferred = this.resizeHandle === 'radius' ? ['radius'] : ['width', 'height'];
                this.syncDisplayResizeScale(this.draggingObject, preferred);
                this.updateGeometryOverlayHint(this.draggingObject, preferred);
                this.renderer.invalidateFields();
            }
        } else if (this.draggingObject.type === 'particle') {
            this.clearGeometryOverlayHint();
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            // 清空轨迹
            this.draggingObject.clearTrajectory();
            if (this.removeParticleIfInDisappearZone(this.draggingObject)) {
                this.clearTangencyHint();
                this.clearGeometryOverlayHint();
                this.draggingObject = null;
                this.isDragging = false;
                this.canvas.style.cursor = 'default';
                return;
            }
        } else {
            this.clearGeometryOverlayHint();
            this.draggingObject.x = pos.x - this.dragOffset.x;
            this.draggingObject.y = pos.y - this.dragOffset.y;
            this.renderer.invalidateFields();
        }

        this.updateTangencyHintAndSnap(e);

        // 🔧 FIX: 暂停时强制渲染，否则拖拽的对象会消失
        if (this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.draggingObject = null;
        this.clearTangencyHint();
        this.clearGeometryOverlayHint();
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.isPanning = false;
        this.panStartScreen = null;
        this.panStartCamera = null;
        this.canvas.style.cursor = 'default';
    }

    getMagneticResizeHandles(field) {
        const shape = field.shape || 'rect';
        if (shape === 'circle') {
            const r = Math.max(0, field.radius ?? 0);
            return [{ key: 'radius', x: field.x + r, y: field.y }];
        }
        if (shape === 'triangle') {
            const x = field.x;
            const y = field.y;
            const w = field.width ?? 0;
            const h = field.height ?? 0;
            return [
                { key: 'apex', x: x + w / 2, y },
                { key: 'bl', x, y: y + h },
                { key: 'br', x: x + w, y: y + h }
            ];
        }
        const x = field.x;
        const y = field.y;
        const w = field.width ?? 0;
        const h = field.height ?? 0;
        return [
            { key: 'nw', x, y },
            { key: 'ne', x: x + w, y },
            { key: 'sw', x, y: y + h },
            { key: 'se', x: x + w, y: y + h }
        ];
    }

    getMagneticResizeHandle(field, pos) {
        const handles = this.getMagneticResizeHandles(field);
        const tolerance = 10;
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

    resizeMagneticField(field, pos) {
        if (!this.resizeHandle || !this.resizeStart) return;

        const minSize = 30;
        const minRadius = 15;
        const start = this.resizeStart;
        const shape = field.shape || start.shape || 'rect';

        if (shape === 'circle') {
            const cx = start.x;
            const cy = start.y;
            const r = Math.max(minRadius, Math.hypot(pos.x - cx, pos.y - cy));
            field.x = cx;
            field.y = cy;
            field.radius = r;
            field.width = r * 2;
            field.height = r * 2;
            return;
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
            field.radius = Math.min(width, height) / 2;
        };

        if (shape === 'triangle') {
            if (this.resizeHandle === 'apex') {
                const newY = Math.min(pos.y, startBottom - minSize);
                const newH = Math.max(minSize, startBottom - newY);
                setRect({ x: startX, y: newY, width: Math.max(minSize, startW), height: newH });
                return;
            }
            if (this.resizeHandle === 'bl') {
                const newX = Math.min(pos.x, startRight - minSize);
                const newW = Math.max(minSize, startRight - newX);
                const newH = Math.max(minSize, pos.y - startY);
                setRect({ x: newX, y: startY, width: newW, height: newH });
                return;
            }
            // br
            const newW = Math.max(minSize, pos.x - startX);
            const newH = Math.max(minSize, pos.y - startY);
            setRect({ x: startX, y: startY, width: newW, height: newH });
            return;
        }

        // rect
        if (this.resizeHandle === 'nw') {
            const newX = Math.min(pos.x, startRight - minSize);
            const newY = Math.min(pos.y, startBottom - minSize);
            const newW = Math.max(minSize, startRight - newX);
            const newH = Math.max(minSize, startBottom - newY);
            setRect({ x: newX, y: newY, width: newW, height: newH });
            return;
        }
        if (this.resizeHandle === 'ne') {
            const newY = Math.min(pos.y, startBottom - minSize);
            const newW = Math.max(minSize, pos.x - startX);
            const newH = Math.max(minSize, startBottom - newY);
            setRect({ x: startX, y: newY, width: newW, height: newH });
            return;
        }
        if (this.resizeHandle === 'sw') {
            const newX = Math.min(pos.x, startRight - minSize);
            const newW = Math.max(minSize, startRight - newX);
            const newH = Math.max(minSize, pos.y - startY);
            setRect({ x: newX, y: startY, width: newW, height: newH });
            return;
        }

        // se (default)
        const newW = Math.max(minSize, pos.x - startX);
        const newH = Math.max(minSize, pos.y - startY);
        setRect({ x: startX, y: startY, width: newW, height: newH });
    }

    getRegistryEntry(object) {
        if (!object) return null;
        return registry.get(object.type);
    }

    getInteractionKind(object) {
        return this.getRegistryEntry(object)?.interaction?.kind || null;
    }

    isMagneticResizable(object) {
        const kind = this.getInteractionKind(object);
        if (kind) return kind === 'magnetic-field';
        return object?.type === 'magnetic-field';
    }

    isElectricResizable(object) {
        const kind = this.getInteractionKind(object);
        if (kind) return kind === 'electric-field';
        if (!object) return false;
        return object.type === 'electric-field-rect' ||
            object.type === 'electric-field-circle' ||
            object.type === 'semicircle-electric-field';
    }

    getElectricResizeMode(field) {
        const entry = this.getRegistryEntry(field);
        if (entry?.interaction?.kind === 'electric-field' && entry?.interaction?.resizeMode) {
            return entry.interaction.resizeMode;
        }
        if (!field) return 'rect';
        if (field.type === 'electric-field-circle' || field.type === 'semicircle-electric-field') {
            return 'radius';
        }
        return 'rect';
    }

    getElectricResizeHandles(field) {
        if (!field) return [];
        if (this.getElectricResizeMode(field) === 'radius') {
            const r = Math.max(0, field.radius ?? 0);
            return [{ key: 'radius', x: field.x + r, y: field.y }];
        }
        // rect (默认)
        const x = field.x;
        const y = field.y;
        const w = field.width ?? 0;
        const h = field.height ?? 0;
        return [
            { key: 'nw', x, y },
            { key: 'ne', x: x + w, y },
            { key: 'sw', x, y: y + h },
            { key: 'se', x: x + w, y: y + h }
        ];
    }

    getElectricResizeHandle(field, pos) {
        const handles = this.getElectricResizeHandles(field);
        const tolerance = 10;
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

    resizeElectricField(field, pos) {
        if (!this.resizeHandle || !this.resizeStart) return;

        const minSize = 30;
        const minRadius = 15;
        const start = this.resizeStart;

        if (this.getElectricResizeMode(field) === 'radius') {
            const cx = start.x;
            const cy = start.y;
            const r = Math.max(minRadius, Math.hypot(pos.x - cx, pos.y - cy));
            field.x = cx;
            field.y = cy;
            field.radius = r;
            return;
        }

        // rect
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
        };

        if (this.resizeHandle === 'nw') {
            const newX = Math.min(pos.x, startRight - minSize);
            const newY = Math.min(pos.y, startBottom - minSize);
            const newW = Math.max(minSize, startRight - newX);
            const newH = Math.max(minSize, startBottom - newY);
            setRect({ x: newX, y: newY, width: newW, height: newH });
            return;
        }
        if (this.resizeHandle === 'ne') {
            const newY = Math.min(pos.y, startBottom - minSize);
            const newW = Math.max(minSize, pos.x - startX);
            const newH = Math.max(minSize, startBottom - newY);
            setRect({ x: startX, y: newY, width: newW, height: newH });
            return;
        }
        if (this.resizeHandle === 'sw') {
            const newX = Math.min(pos.x, startRight - minSize);
            const newW = Math.max(minSize, startRight - newX);
            const newH = Math.max(minSize, pos.y - startY);
            setRect({ x: newX, y: startY, width: newW, height: newH });
            return;
        }

        // se
        const newW = Math.max(minSize, pos.x - startX);
        const newH = Math.max(minSize, pos.y - startY);
        setRect({ x: startX, y: startY, width: newW, height: newH });
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

        if (clickedObject) {
            this.scene.selectedObject = clickedObject;

            if (prevSelectedObject !== this.scene.selectedObject) {
                this.requestSceneRender({ invalidateFields: true, updateUI: true });
            }

            // 显示右键菜单
            const contextMenu = document.getElementById('context-menu');
            if (!contextMenu) return;
            contextMenu.style.left = e.clientX + 'px';
            contextMenu.style.top = e.clientY + 'px';
            contextMenu.style.display = 'block';
            this.clearContextMenuCloseTimer();
            this.clearContextMenuCloseHandler();

            // 点击外部关闭菜单
            this.contextMenuCloseTimer = setTimeout(() => {
                const closeMenu = () => {
                    contextMenu.style.display = 'none';
                    this.clearContextMenuCloseHandler();
                };
                this.contextMenuCloseTimer = null;
                this.contextMenuCloseHandler = closeMenu;
                document.addEventListener('click', closeMenu);
            }, 0);
        }
    }
}
