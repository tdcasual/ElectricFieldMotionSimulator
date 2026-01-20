/**
 * 拖拽管理器
 */

import { Particle } from '../objects/Particle.js';
import { RectElectricField } from '../objects/RectElectricField.js';
import { CircleElectricField } from '../objects/CircleElectricField.js';
import { SemiCircleElectricField } from '../objects/SemiCircleElectricField.js';
import { ParallelPlateCapacitor } from '../objects/ParallelPlateCapacitor.js';
import { VerticalParallelPlateCapacitor } from '../objects/VerticalParallelPlateCapacitor.js';
import { MagneticField } from '../objects/MagneticField.js';
import { DisappearZone } from '../objects/DisappearZone.js';
import { ElectronGun } from '../objects/ElectronGun.js';
import { ProgrammableEmitter } from '../objects/ProgrammableEmitter.js';
import { FluorescentScreen } from '../objects/FluorescentScreen.js';

export class DragDropManager {
    constructor(scene, renderer, options = {}) {
        this.scene = scene;
        this.renderer = renderer;
        
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
        
        // 允许外部传入 canvas（测试页面或自定义场景）
        this.canvas = options.canvas || document.getElementById('particle-canvas');
        
        this.init();
    }
    
    init() {
        if (!this.canvas) {
            console.warn('DragDropManager: canvas not found, skipping canvas event binding.');
            return;
        }

        // 工具栏拖拽事件
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('component-type', item.dataset.type);
            });

            // 触屏设备：点击工具后，再点击画布放置对象（替代原生拖拽）
            item.addEventListener('click', (e) => {
                if (!this.isCoarsePointer) return;
                e.preventDefault();
                this.toggleArmedTool(item);
            });
        });
        
        // Canvas接收拖拽
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('component-type');
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.createObject(type, x, y);
        });
        
        // Canvas内对象拖拽（Pointer Events 优先，兼容触屏）
        if (window.PointerEvent) {
            this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
            this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
            this.canvas.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
        } else {
            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        }
        
        // 右键菜单
        this.canvas.addEventListener('contextmenu', (e) => this.onContextMenu(e));
    }
    
    createObject(type, x, y) {
        let object = null;
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : 1;
        
        switch (type) {
            case 'electric-field-rect':
                object = new RectElectricField({ x, y, width: 200, height: 150, strength: 1000, direction: 90 });
                break;
            case 'electric-field-circle':
                object = new CircleElectricField({ x, y, radius: 100, strength: 1000, direction: 90 });
                break;
            case 'electric-field-semicircle':
                object = new SemiCircleElectricField({ x, y, radius: 100, strength: 1000, direction: 90, orientation: 0 });
                break;
            case 'capacitor':
                object = new ParallelPlateCapacitor({ x, y, width: 200, plateDistance: 80, strength: 1000, direction: 0, polarity: 1 });
                break;
            case 'vertical-capacitor':
                object = new VerticalParallelPlateCapacitor({ x, y, height: 200, plateDistance: 80, strength: 1000, polarity: 1 });
                break;
            case 'magnetic-field':
                object = new MagneticField({ x, y, shape: 'rect', width: 200, height: 150, strength: 0.5 });
                break;
            case 'magnetic-field-long':
                object = new MagneticField({ x, y, shape: 'rect', width: 320, height: 90, strength: 0.5 });
                break;
            case 'magnetic-field-circle':
                object = new MagneticField({ x, y, shape: 'circle', radius: 90, strength: 0.5 });
                break;
            case 'magnetic-field-triangle':
                object = new MagneticField({ x, y, shape: 'triangle', width: 240, height: 180, strength: 0.5 });
                break;
            case 'electron-gun':
                object = new ElectronGun({
                    x, y,
                    direction: 0,
                    emissionRate: 2,
                    emissionSpeed: 200 * pixelsPerMeter,
                    particleType: 'electron'
                });
                break;
            case 'programmable-emitter':
                object = new ProgrammableEmitter({
                    x,
                    y,
                    direction: 0,
                    emissionSpeed: 200 * pixelsPerMeter,
                    speedMode: 'fixed',
                    speedMin: 200 * pixelsPerMeter,
                    speedMax: 200 * pixelsPerMeter,
                    speedListMode: 'sequential',
                    speedListLoop: true,
                    speedList: [],
                    barrelLength: 25,
                    startTime: 0,
                    emissionMode: 'burst',
                    emissionCount: 6,
                    emissionInterval: 0.15,
                    angleMode: 'fixed',
                    angleMin: 0,
                    angleMax: 360,
                    angleListMode: 'sequential',
                    angleListLoop: true,
                    angleList: [],
                    particleType: 'electron',
                    keepTrajectory: true,
                    ignoreGravity: true
                });
                break;
            case 'fluorescent-screen':
                object = new FluorescentScreen({
                    x, y,
                    width: 150,
                    height: 150,
                    depth: 30,
                    spotSize: 6,
                    persistence: 1.5
                });
                break;
            case 'disappear-zone':
                object = new DisappearZone({
                    x,
                    y,
                    length: 360,
                    angle: 0,
                    lineWidth: 6
                });
                break;
            case 'particle':
                object = new Particle({ 
                    x, y, 
                    vx: 50 * pixelsPerMeter, vy: 0, 
                    mass: 9.109e-31, 
                    charge: -1.602e-19,
                    ignoreGravity: true
                });
                break;
        }
        
        if (object) {
            this.scene.addObject(object);
            const app = window.app;
            if (app?.requestRender && app.scene === this.scene) {
                app.requestRender({ invalidateFields: true });
            } else {
                this.renderer?.invalidateFields?.();
                if (this.scene.isPaused) {
                    this.renderer?.render?.(this.scene);
                }
                window.app?.updateUI?.();
            }
        }
    }

    setStatus(text) {
        const el = document.getElementById('status-text');
        if (el) el.textContent = text;
    }

    toggleArmedTool(item) {
        const type = item?.dataset?.type;
        if (!type) return;

        if (this.armedToolType === type) {
            this.disarmTool();
        } else {
            this.armTool(type, item);
        }
    }

    armTool(type, element) {
        if (this.armedToolElement) {
            this.armedToolElement.classList.remove('active');
        }

        this.armedToolType = type;
        this.armedToolElement = element || null;
        this.armedToolElement?.classList.add('active');

        const label = element?.title || element?.querySelector?.('span')?.textContent || type;
        this.setStatus(`点击画布放置: ${label}`);
    }

    disarmTool() {
        if (this.armedToolElement) {
            this.armedToolElement.classList.remove('active');
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

    openProperties(object) {
        if (!object) return;
        const event = new CustomEvent('show-properties', {
            detail: { object }
        });
        document.dispatchEvent(event);
    }

    onPointerDown(e) {
        if (!this.canvas) return;
        if (this.activePointerId !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        this.activePointerId = e.pointerId;
        this.longPressTriggered = false;
        this.pointerDownPos = this.getMousePos(e);

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
            this.draggingObject = clickedObject;
            this.scene.selectedObject = clickedObject;
            this.isDragging = false;
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;

            if (clickedObject.type === 'magnetic-field') {
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
            this.clearLongPressTimer();
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;
        }

        if (prevSelectedObject !== this.scene.selectedObject) {
            const app = window.app;
            if (app?.requestRender && app.scene === this.scene) {
                app.requestRender({ invalidateFields: true, updateUI: false });
            } else {
                this.renderer?.invalidateFields?.();
                if (this.scene.isPaused) {
                    this.renderer?.render?.(this.scene);
                }
            }
        }
    }

    onPointerMove(e) {
        if (this.activePointerId !== e.pointerId) return;
        if (!this.draggingObject || !this.pointerDownPos) return;

        const pos = this.getMousePos(e);
        const dx = pos.x - this.pointerDownPos.x;
        const dy = pos.y - this.pointerDownPos.y;
        const thresholdSq = e.pointerType === 'mouse' ? 1 : 9;

        if (!this.isDragging) {
            if ((dx * dx + dy * dy) < thresholdSq) return;
            this.isDragging = true;
            this.clearLongPressTimer();
        }

        if (this.dragMode === 'resize') {
            if (this.draggingObject.type === 'magnetic-field') {
                this.resizeMagneticField(this.draggingObject, pos);
                this.renderer.invalidateFields();
            } else if (this.isElectricResizable(this.draggingObject)) {
                this.resizeElectricField(this.draggingObject, pos);
                this.renderer.invalidateFields();
            }
        } else if (this.draggingObject.type === 'particle') {
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            this.draggingObject.clearTrajectory();
            if (this.removeParticleIfInDisappearZone(this.draggingObject)) {
                this.draggingObject = null;
                this.isDragging = false;
                this.pointerDownObject = null;
                this.canvas.style.cursor = 'default';
                this.canvas.releasePointerCapture?.(e.pointerId);
                this.activePointerId = null;
                return;
            }
        } else {
            this.draggingObject.x = pos.x - this.dragOffset.x;
            this.draggingObject.y = pos.y - this.dragOffset.y;
            this.renderer.invalidateFields();
        }

        if (this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
    }

    onPointerUp(e) {
        if (this.activePointerId !== e.pointerId) return;

        const tappedObject = this.pointerDownObject;
        const wasDragging = this.isDragging;
        const shouldHandleTap = !wasDragging && tappedObject && !this.longPressTriggered && e.pointerType !== 'mouse';

        this.clearLongPressTimer();

        if (shouldHandleTap) {
            const now = performance.now();
            if (this.lastTap.objectId === tappedObject.id && (now - this.lastTap.time) < 350) {
                this.openProperties(tappedObject);
                this.lastTap = { time: 0, objectId: null };
            } else {
                this.lastTap = { time: now, objectId: tappedObject.id };
            }
        }

        this.isDragging = false;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTriggered = false;
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;

        if (e.pointerType === 'mouse') {
            this.canvas.style.cursor = 'default';
        }

        this.canvas.releasePointerCapture?.(e.pointerId);
        this.activePointerId = null;
    }

    onPointerCancel(e) {
        if (this.activePointerId !== e.pointerId) return;
        this.clearLongPressTimer();
        this.isDragging = false;
        this.draggingObject = null;
        this.pointerDownPos = null;
        this.pointerDownObject = null;
        this.longPressTriggered = false;
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
        this.canvas.releasePointerCapture?.(e.pointerId);
        this.activePointerId = null;
        this.canvas.style.cursor = 'default';
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    onMouseDown(e) {
        if (e.button !== 0) return; // 只处理左键
        
        const pos = this.getMousePos(e);
        const prevSelectedObject = this.scene.selectedObject;
        const clickedObject = this.scene.findObjectAt(pos.x, pos.y);
        
        if (clickedObject) {
            this.draggingObject = clickedObject;
            this.scene.selectedObject = clickedObject;
            this.isDragging = true;
            this.dragMode = 'move';
            this.resizeHandle = null;
            this.resizeStart = null;

            if (clickedObject.type === 'magnetic-field') {
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
        }

        if (prevSelectedObject !== this.scene.selectedObject) {
            const app = window.app;
            if (app?.requestRender && app.scene === this.scene) {
                app.requestRender({ invalidateFields: true, updateUI: false });
            } else {
                this.renderer?.invalidateFields?.();
                if (this.scene.isPaused) {
                    this.renderer?.render?.(this.scene);
                }
            }
        }
    }
    
    onMouseMove(e) {
        if (!this.isDragging || !this.draggingObject) return;
        
        const pos = this.getMousePos(e);

        if (this.dragMode === 'resize') {
            if (this.draggingObject.type === 'magnetic-field') {
                this.resizeMagneticField(this.draggingObject, pos);
                this.renderer.invalidateFields();
            } else if (this.isElectricResizable(this.draggingObject)) {
                this.resizeElectricField(this.draggingObject, pos);
                this.renderer.invalidateFields();
            }
        } else if (this.draggingObject.type === 'particle') {
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            // 清空轨迹
            this.draggingObject.clearTrajectory();
            if (this.removeParticleIfInDisappearZone(this.draggingObject)) {
                this.draggingObject = null;
                this.isDragging = false;
                this.canvas.style.cursor = 'default';
                return;
            }
        } else {
            this.draggingObject.x = pos.x - this.dragOffset.x;
            this.draggingObject.y = pos.y - this.dragOffset.y;
            this.renderer.invalidateFields();
        }
        
        // 🔧 FIX: 暂停时强制渲染，否则拖拽的对象会消失
        if (this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.draggingObject = null;
        this.dragMode = 'move';
        this.resizeHandle = null;
        this.resizeStart = null;
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

    isElectricResizable(object) {
        if (!object) return false;
        return object.type === 'electric-field-rect' ||
            object.type === 'electric-field-circle' ||
            object.type === 'semicircle-electric-field';
    }

    getElectricResizeHandles(field) {
        if (!field) return [];
        if (field.type === 'electric-field-circle' || field.type === 'semicircle-electric-field') {
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

        if (field.type === 'electric-field-circle' || field.type === 'semicircle-electric-field') {
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
        const radius = Number.isFinite(particle.radius) ? particle.radius : 0;

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
            const threshold = radius + lineWidth / 2;

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
                if (this.scene.selectedObject === particle) {
                    this.scene.selectedObject = null;
                    window.app?.propertyPanel?.hide?.();
                }
                window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
                return true;
            }
        }
        return false;
    }
    
    onContextMenu(e) {
        e.preventDefault();
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
                const app = window.app;
                if (app?.requestRender && app.scene === this.scene) {
                    app.requestRender({ invalidateFields: true, updateUI: false });
                } else {
                    this.renderer?.invalidateFields?.();
                    if (this.scene.isPaused) {
                        this.renderer?.render?.(this.scene);
                    }
                }
            }
            
            // 显示右键菜单
            const contextMenu = document.getElementById('context-menu');
            contextMenu.style.left = e.clientX + 'px';
            contextMenu.style.top = e.clientY + 'px';
            contextMenu.style.display = 'block';
            
            // 点击外部关闭菜单
            setTimeout(() => {
                const closeMenu = () => {
                    contextMenu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                };
                document.addEventListener('click', closeMenu);
            }, 0);
        }
    }
}
