/**
 * 场景管理器 - 管理所有对象和状态
 */

import { registry } from './registerObjects.js';
import { OBJECT_SCALE_KEY, REAL_STORE_KEY } from '../modes/GeometryScaling.js';

export class Scene {
    constructor() {
        this.objects = [];
        this.electricFields = [];
        this.magneticFields = [];
        this.disappearZones = [];
        this.emitters = [];
        this.particles = [];
        this.selectedObject = null;
        this.isPaused = false;
        this.time = 0; // 模拟时间（秒）
        this.viewport = { width: 0, height: 0 };
        this.camera = { offsetX: 0, offsetY: 0 };
        this.interaction = { tangencyHint: null };

        // 场景设置
        this.settings = {
            mode: 'normal',
            showGrid: true,
            gridSize: 50,
            showTrajectories: true,
            showEnergy: true,
            showFieldVectors: true,
            pixelsPerMeter: 1, // 比例尺：1m = pixelsPerMeter px
            gravity: 10, // m/s^2
            boundaryMode: 'margin', // remove | bounce | wrap | margin
            boundaryMargin: 200 // px（仅 margin 模式使用）
        };

        // 场景变量（用于表达式引用）
        this.variables = {};
    }

    setViewport(width, height) {
        const w = Number.isFinite(width) ? width : 0;
        const h = Number.isFinite(height) ? height : 0;
        this.viewport.width = Math.max(0, w);
        this.viewport.height = Math.max(0, h);
    }

    getCameraOffset() {
        const offsetX = Number.isFinite(this.camera?.offsetX) ? this.camera.offsetX : 0;
        const offsetY = Number.isFinite(this.camera?.offsetY) ? this.camera.offsetY : 0;
        return { offsetX, offsetY };
    }

    setCamera(offsetX = 0, offsetY = 0) {
        this.camera.offsetX = Number.isFinite(offsetX) ? offsetX : 0;
        this.camera.offsetY = Number.isFinite(offsetY) ? offsetY : 0;
    }

    toWorldPoint(screenX, screenY) {
        const x = Number.isFinite(screenX) ? screenX : 0;
        const y = Number.isFinite(screenY) ? screenY : 0;
        const { offsetX, offsetY } = this.getCameraOffset();
        return { x: x - offsetX, y: y - offsetY };
    }

    toScreenPoint(worldX, worldY) {
        const x = Number.isFinite(worldX) ? worldX : 0;
        const y = Number.isFinite(worldY) ? worldY : 0;
        const { offsetX, offsetY } = this.getCameraOffset();
        return { x: x + offsetX, y: y + offsetY };
    }

    getWorldViewportBounds(extra = 0) {
        const normalizeZero = (value) => (Object.is(value, -0) ? 0 : value);
        const margin = Number.isFinite(extra) ? extra : 0;
        const width = Number.isFinite(this.viewport?.width) ? this.viewport.width : 0;
        const height = Number.isFinite(this.viewport?.height) ? this.viewport.height : 0;
        const { offsetX, offsetY } = this.getCameraOffset();
        return {
            minX: normalizeZero(-offsetX - margin),
            maxX: normalizeZero((width - offsetX) + margin),
            minY: normalizeZero(-offsetY - margin),
            maxY: normalizeZero((height - offsetY) + margin)
        };
    }

    /**
     * 添加对象到场景
     */
    addObject(object) {
        if (!object || typeof object !== 'object') return null;
        const type = typeof object.type === 'string' ? object.type : '';
        if (!type) return null;
        if (this.objects.includes(object)) {
            object.scene = this;
            return object;
        }
        this.objects.push(object);
        // 平行板和垂直平行板没有 electric 关键字，但在功能上属于电场对象
        const isElectric = type.includes('electric') ||
            type === 'parallel-plate-capacitor' ||
            type === 'vertical-parallel-plate-capacitor';

        if (isElectric) {
            this.electricFields.push(object);
        } else if (type.includes('magnetic')) {
            this.magneticFields.push(object);
        } else if (type === 'disappear-zone') {
            this.disappearZones.push(object);
        } else if (type === 'electron-gun' || type === 'programmable-emitter') {
            this.emitters.push(object);
        } else if (type === 'particle') {
            this.particles.push(object);
        }

        object.scene = this;
        return object;
    }

    /**
     * 从场景移除对象
     */
    removeObject(object) {
        if (!object || typeof object !== 'object') {
            return this;
        }
        const type = typeof object.type === 'string' ? object.type : '';
        const isElectric = type.includes('electric') ||
            type === 'parallel-plate-capacitor' ||
            type === 'vertical-parallel-plate-capacitor';

        if (isElectric) {
            const index = this.electricFields.indexOf(object);
            if (index > -1) this.electricFields.splice(index, 1);
        } else if (type.includes('magnetic')) {
            const index = this.magneticFields.indexOf(object);
            if (index > -1) this.magneticFields.splice(index, 1);
        } else if (type === 'disappear-zone') {
            const index = this.disappearZones.indexOf(object);
            if (index > -1) this.disappearZones.splice(index, 1);
        } else if (type === 'electron-gun' || type === 'programmable-emitter') {
            const index = this.emitters.indexOf(object);
            if (index > -1) this.emitters.splice(index, 1);
        } else if (type === 'particle') {
            const index = this.particles.indexOf(object);
            if (index > -1) this.particles.splice(index, 1);
        }

        const index = this.objects.indexOf(object);
        if (index > -1) this.objects.splice(index, 1);
        if (this.selectedObject === object) {
            this.selectedObject = null;
        }

        return this;
    }

    /**
     * 获取所有对象
     */
    getAllObjects() {
        return [...this.objects];
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
        this.objects = [];
        this.electricFields = [];
        this.magneticFields = [];
        this.disappearZones = [];
        this.emitters = [];
        this.particles = [];
        this.selectedObject = null;
        this.time = 0;
        this.variables = {};
        this.interaction = { tangencyHint: null };
        this.setCamera(0, 0);
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
        const sourceReal = object?.[REAL_STORE_KEY];
        if (sourceReal && typeof sourceReal === 'object' && !Array.isArray(sourceReal)) {
            newObject[REAL_STORE_KEY] = { ...sourceReal };
        }
        const sourceScale = Number(object?.[OBJECT_SCALE_KEY]);
        if (Number.isFinite(sourceScale) && sourceScale > 0) {
            newObject[OBJECT_SCALE_KEY] = sourceScale;
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
            camera: { ...this.getCameraOffset() },
            variables: { ...(this.variables || {}) },
            objects: this.objects.map(obj => obj.serialize())
        };
    }

    /**
     * 从数据加载场景
     */
    loadFromData(data) {
        // 变量：默认重置，避免加载旧场景时“继承”上一次的变量表
        this.variables = {};
        this.selectedObject = null;
        this.setCamera(0, 0);

        // 清空对象
        this.objects = [];
        this.electricFields = [];
        this.magneticFields = [];
        this.disappearZones = [];
        this.emitters = [];
        this.particles = [];

        if (Array.isArray(data.objects)) {
            for (const objData of data.objects) {
                const entry = registry.get(objData?.type);
                if (!entry) continue;
                const instance = registry.create(objData.type, objData);
                this.addObject(instance);
            }
        }

        // 加载设置
        if (data.settings) {
            Object.assign(this.settings, data.settings);
        }

        if (data.camera && typeof data.camera === 'object') {
            const offsetX = Number(data.camera.offsetX);
            const offsetY = Number(data.camera.offsetY);
            this.setCamera(offsetX, offsetY);
        }

        // 运行期交互态（不从存档恢复）
        this.interaction = { tangencyHint: null };

        // 加载变量（可选）
        if (data.variables && typeof data.variables === 'object' && !Array.isArray(data.variables)) {
            const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
            const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
            const next = Object.create(null);
            for (const [rawName, rawValue] of Object.entries(data.variables)) {
                const name = String(rawName ?? '').trim();
                if (!name || !NAME_RE.test(name) || RESERVED.has(name)) continue;
                const value = Number(rawValue);
                if (!Number.isFinite(value)) continue;
                next[name] = value;
            }
            this.variables = { ...next };
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
        return timeVaryingE;
    }
}
