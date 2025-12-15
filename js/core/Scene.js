/**
 * 场景管理器 - 管理所有对象和状态
 */

import { CircleElectricField } from '../objects/CircleElectricField.js';
import { ElectronGun } from '../objects/ElectronGun.js';
import { FluorescentScreen } from '../objects/FluorescentScreen.js';
import { MagneticField } from '../objects/MagneticField.js';
import { ParallelPlateCapacitor } from '../objects/ParallelPlateCapacitor.js';
import { Particle } from '../objects/Particle.js';
import { RectElectricField } from '../objects/RectElectricField.js';
import { SemiCircleElectricField } from '../objects/SemiCircleElectricField.js';
import { VerticalParallelPlateCapacitor } from '../objects/VerticalParallelPlateCapacitor.js';

export class Scene {
    constructor() {
        this.electricFields = [];
        this.magneticFields = [];
        this.emitters = [];
        this.screens = [];
        this.particles = [];
        this.selectedObject = null;
        this.isPaused = false;
        this.time = 0; // 模拟时间（秒）
        this.viewport = { width: 0, height: 0 };
        
        // 场景设置
        this.settings = {
            showGrid: true,
            gridSize: 50,
            showTrajectories: true,
            showEnergy: true,
            showFieldVectors: true
        };
    }

    setViewport(width, height) {
        const w = Number.isFinite(width) ? width : 0;
        const h = Number.isFinite(height) ? height : 0;
        this.viewport.width = Math.max(0, w);
        this.viewport.height = Math.max(0, h);
    }
    
    /**
     * 添加对象到场景
     */
    addObject(object) {
        // 平行板和垂直平行板没有 electric 关键字，但在功能上属于电场对象
        const isElectric = object.type.includes('electric') ||
            object.type === 'parallel-plate-capacitor' ||
            object.type === 'vertical-parallel-plate-capacitor';

        if (isElectric) {
            this.electricFields.push(object);
        } else if (object.type.includes('magnetic')) {
            this.magneticFields.push(object);
        } else if (object.type === 'electron-gun') {
            this.emitters.push(object);
        } else if (object.type === 'fluorescent-screen') {
            this.screens.push(object);
        } else if (object.type === 'particle') {
            this.particles.push(object);
        }
        
        object.scene = this;
        return object;
    }
    
    /**
     * 从场景移除对象
     */
    removeObject(object) {
        const isElectric = object.type.includes('electric') ||
            object.type === 'parallel-plate-capacitor' ||
            object.type === 'vertical-parallel-plate-capacitor';

        if (isElectric) {
            const index = this.electricFields.indexOf(object);
            if (index > -1) this.electricFields.splice(index, 1);
        } else if (object.type.includes('magnetic')) {
            const index = this.magneticFields.indexOf(object);
            if (index > -1) this.magneticFields.splice(index, 1);
        } else if (object.type === 'electron-gun') {
            const index = this.emitters.indexOf(object);
            if (index > -1) this.emitters.splice(index, 1);
        } else if (object.type === 'fluorescent-screen') {
            const index = this.screens.indexOf(object);
            if (index > -1) this.screens.splice(index, 1);
        } else if (object.type === 'particle') {
            const index = this.particles.indexOf(object);
            if (index > -1) this.particles.splice(index, 1);
        }
        
        return this;
    }
    
    /**
     * 获取所有对象
     */
    getAllObjects() {
        return [
            ...this.electricFields,
            ...this.magneticFields,
            ...this.emitters,
            ...this.screens,
            ...this.particles
        ];
    }
    
    /**
     * 查找指定位置的对象
     */
    findObjectAt(x, y) {
        const allObjects = this.getAllObjects();
        
        // 从后往前查找（后添加的在上层）
        for (let i = allObjects.length - 1; i >= 0; i--) {
            const obj = allObjects[i];
            if (obj.containsPoint && obj.containsPoint(x, y)) {
                return obj;
            }
        }
        
        return null;
    }
    
    /**
     * 清空场景
     */
    clear() {
        this.electricFields = [];
        this.magneticFields = [];
        this.emitters = [];
        this.screens = [];
        this.particles = [];
        this.selectedObject = null;
        this.time = 0;
    }
    
    /**
     * 复制对象
     */
    duplicateObject(object) {
        const originalData = object.serialize();
        const data = JSON.parse(JSON.stringify(originalData));

        // 位移位置
        if (typeof data.x === 'number') data.x += 20;
        if (typeof data.y === 'number') data.y += 20;
        if (Array.isArray(data.position) && data.position.length >= 2) {
            data.position[0] += 20;
            data.position[1] += 20;
        }

        // 复制时应生成新 id，避免与原对象冲突
        delete data.id;
        
        const ObjectClass = object.constructor;
        const newObject = new ObjectClass(data);
        if (typeof newObject.deserialize === 'function') {
            newObject.deserialize(data);
        }
        this.addObject(newObject);
        
        return newObject;
    }
    
    /**
     * 序列化场景
     */
    serialize() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            settings: { ...this.settings },
            electricFields: this.electricFields.map(obj => obj.serialize()),
            magneticFields: this.magneticFields.map(obj => obj.serialize()),
            emitters: this.emitters.map(obj => obj.serialize()),
            screens: this.screens.map(obj => obj.serialize()),
            particles: this.particles.map(obj => obj.serialize())
        };
    }
    
    /**
     * 从数据加载场景
     */
    loadFromData(data) {
        // 加载电场
        if (Array.isArray(data.electricFields)) {
            for (const fieldData of data.electricFields) {
                let field = null;
                if (fieldData.type === 'electric-field-rect') {
                    field = new RectElectricField(fieldData);
                } else if (fieldData.type === 'electric-field-circle') {
                    field = new CircleElectricField(fieldData);
                } else if (fieldData.type === 'semicircle-electric-field') {
                    field = new SemiCircleElectricField(fieldData);
                } else if (fieldData.type === 'parallel-plate-capacitor') {
                    field = new ParallelPlateCapacitor(fieldData);
                } else if (fieldData.type === 'vertical-parallel-plate-capacitor') {
                    field = new VerticalParallelPlateCapacitor(fieldData);
                }

                if (field) {
                    field.deserialize(fieldData);
                    this.addObject(field);
                }
            }
        }

        // 加载磁场
        if (Array.isArray(data.magneticFields)) {
            for (const fieldData of data.magneticFields) {
                const field = new MagneticField(fieldData);
                field.deserialize(fieldData);
                this.addObject(field);
            }
        }

        // 加载发射器
        if (Array.isArray(data.emitters)) {
            for (const emitterData of data.emitters) {
                if (emitterData.type === 'electron-gun') {
                    const emitter = new ElectronGun(emitterData);
                    emitter.deserialize(emitterData);
                    this.addObject(emitter);
                }
            }
        }

        // 加载荧光屏
        if (Array.isArray(data.screens)) {
            for (const screenData of data.screens) {
                if (screenData.type === 'fluorescent-screen') {
                    const screen = new FluorescentScreen(screenData);
                    screen.deserialize(screenData);
                    this.addObject(screen);
                }
            }
        }

        // 加载粒子
        if (Array.isArray(data.particles)) {
            for (const particleData of data.particles) {
                const particle = new Particle(particleData);
                particle.deserialize(particleData);
                this.addObject(particle);
            }
        }
        
        // 加载设置
        if (data.settings) {
            Object.assign(this.settings, data.settings);
        }

        // 重置时间轴
        this.time = 0;
    }
    
    /**
     * 获取电场强度（所有电场叠加）
     */
    getElectricField(x, y) {
        let Ex = 0, Ey = 0;
        const t = this.time || 0;
        
        for (const field of this.electricFields) {
            const E = field.getFieldAt(x, y, t);
            Ex += E.x;
            Ey += E.y;
        }
        
        return { x: Ex, y: Ey };
    }
    
    /**
     * 获取磁场强度（所有磁场叠加）
     */
    getMagneticField(x, y) {
        let Bz = 0;
        
        for (const field of this.magneticFields) {
            Bz += field.getFieldAt(x, y, this.time || 0);
        }
        
        return Bz;
    }

    hasTimeVaryingFields() {
        const timeVaryingE = this.electricFields.some(field => typeof field.isTimeVarying === 'function' && field.isTimeVarying());
        const screensActive = this.screens?.some(screen => screen.hits && screen.hits.length > 0);
        return timeVaryingE || screensActive;
    }
}
