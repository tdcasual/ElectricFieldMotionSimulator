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
import { ElectronGun } from '../objects/ElectronGun.js';
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
                object = new MagneticField({ x, y, width: 200, height: 150, strength: 0.5 });
                break;
            case 'electron-gun':
                object = new ElectronGun({
                    x, y,
                    direction: 0,
                    emissionRate: 2,
                    emissionSpeed: 200,
                    particleType: 'electron'
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
            case 'particle':
                object = new Particle({ 
                    x, y, 
                    vx: 50, vy: 0, 
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

            if (clickedObject.type === 'particle') {
                clickedObject.stuckToCapacitor = false;
                this.dragOffset = {
                    x: this.pointerDownPos.x - clickedObject.position.x,
                    y: this.pointerDownPos.y - clickedObject.position.y
                };
            } else {
                this.dragOffset = {
                    x: this.pointerDownPos.x - clickedObject.x,
                    y: this.pointerDownPos.y - clickedObject.y
                };
            }

            if (e.pointerType === 'mouse') {
                this.canvas.style.cursor = 'grabbing';
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

        if (this.draggingObject.type === 'particle') {
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            this.draggingObject.clearTrajectory();
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
            
            if (clickedObject.type === 'particle') {
                // 解除贴板状态以允许重新拖动
                clickedObject.stuckToCapacitor = false;
                this.dragOffset = {
                    x: pos.x - clickedObject.position.x,
                    y: pos.y - clickedObject.position.y
                };
            } else {
                this.dragOffset = {
                    x: pos.x - clickedObject.x,
                    y: pos.y - clickedObject.y
                };
            }
            
            this.canvas.style.cursor = 'grabbing';
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
        
        if (this.draggingObject.type === 'particle') {
            this.draggingObject.position.x = pos.x - this.dragOffset.x;
            this.draggingObject.position.y = pos.y - this.dragOffset.y;
            // 清空轨迹
            this.draggingObject.clearTrajectory();
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
        this.canvas.style.cursor = 'default';
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
