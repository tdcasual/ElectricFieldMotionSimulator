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
        
        // Canvas内对象拖拽
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
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
            this.renderer?.invalidateFields?.();
            if (this.scene.isPaused) {
                this.renderer?.render?.(this.scene);
            }
        }
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
        const pos = this.getMousePos(e);
        const clickedObject = this.scene.findObjectAt(pos.x, pos.y);
        
        if (clickedObject) {
            this.scene.selectedObject = clickedObject;
            
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
