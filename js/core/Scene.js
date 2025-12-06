/**
 * 场景管理器 - 管理所有对象和状态
 */

export class Scene {
    constructor() {
        this.electricFields = [];
        this.magneticFields = [];
        this.particles = [];
        this.selectedObject = null;
        this.isPaused = false;  // 暂停状态标志
        
        // 场景设置
        this.settings = {
            showGrid: true,
            gridSize: 50,
            showTrajectories: true,
            showEnergy: true,
            showFieldVectors: true
        };
    }
    
    /**
     * 添加对象到场景
     */
    addObject(object) {
        // 平行板电容器没有带 electric 关键字，但在功能上仍属于电场对象
        const isElectric = object.type.includes('electric') || object.type === 'parallel-plate-capacitor';

        if (isElectric) {
            this.electricFields.push(object);
        } else if (object.type.includes('magnetic')) {
            this.magneticFields.push(object);
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
        const isElectric = object.type.includes('electric') || object.type === 'parallel-plate-capacitor';

        if (isElectric) {
            const index = this.electricFields.indexOf(object);
            if (index > -1) this.electricFields.splice(index, 1);
        } else if (object.type.includes('magnetic')) {
            const index = this.magneticFields.indexOf(object);
            if (index > -1) this.magneticFields.splice(index, 1);
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
        this.particles = [];
        this.selectedObject = null;
    }
    
    /**
     * 复制对象
     */
    duplicateObject(object) {
        const data = object.serialize();
        // 偏移位置
        data.x += 20;
        data.y += 20;
        
        const ObjectClass = object.constructor;
        const newObject = new ObjectClass(data);
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
            particles: this.particles.map(obj => obj.serialize())
        };
    }
    
    /**
     * 从数据加载场景
     */
    loadFromData(data) {
        // 导入对象类
        import('../objects/RectElectricField.js').then(module => {
            const RectElectricField = module.RectElectricField;
            
            // 加载矩形电场
            if (data.electricFields) {
                data.electricFields.forEach(fieldData => {
                    if (fieldData.type === 'electric-field-rect') {
                        const field = new RectElectricField(fieldData);
                        field.deserialize(fieldData);
                        this.addObject(field);
                    }
                });
            }
        });
        
        import('../objects/CircleElectricField.js').then(module => {
            const CircleElectricField = module.CircleElectricField;
            
            // 加载圆形电场
            if (data.electricFields) {
                data.electricFields.forEach(fieldData => {
                    if (fieldData.type === 'electric-field-circle') {
                        const field = new CircleElectricField(fieldData);
                        field.deserialize(fieldData);
                        this.addObject(field);
                    }
                });
            }
        });
        
        import('../objects/SemiCircleElectricField.js').then(module => {
            const SemiCircleElectricField = module.SemiCircleElectricField;
            
            // 加载半圆电场
            if (data.electricFields) {
                data.electricFields.forEach(fieldData => {
                    if (fieldData.type === 'semicircle-electric-field') {
                        const field = new SemiCircleElectricField(fieldData);
                        field.deserialize(fieldData);
                        this.addObject(field);
                    }
                });
            }
        });
        
        import('../objects/ParallelPlateCapacitor.js').then(module => {
            const ParallelPlateCapacitor = module.ParallelPlateCapacitor;
            
            // 加载平行板电容器
            if (data.electricFields) {
                data.electricFields.forEach(fieldData => {
                    if (fieldData.type === 'parallel-plate-capacitor') {
                        const field = new ParallelPlateCapacitor(fieldData);
                        field.deserialize(fieldData);
                        this.addObject(field);
                    }
                });
            }
        });
        
        import('../objects/MagneticField.js').then(module => {
            const MagneticField = module.MagneticField;
            
            // 加载磁场
            if (data.magneticFields) {
                data.magneticFields.forEach(fieldData => {
                    const field = new MagneticField(fieldData);
                    field.deserialize(fieldData);
                    this.addObject(field);
                });
            }
        });
        
        import('../objects/Particle.js').then(module => {
            const Particle = module.Particle;
            
            // 加载粒子
            if (data.particles) {
                data.particles.forEach(particleData => {
                    const particle = new Particle(particleData);
                    particle.deserialize(particleData);
                    this.addObject(particle);
                });
            }
        });
        
        // 加载设置
        if (data.settings) {
            Object.assign(this.settings, data.settings);
        }
    }
    
    /**
     * 获取场强（所有电场叠加）
     */
    getElectricField(x, y) {
        let Ex = 0, Ey = 0;
        
        for (const field of this.electricFields) {
            const E = field.getFieldAt(x, y);
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
            Bz += field.getFieldAt(x, y);
        }
        
        return Bz;
    }
}
