/**
 * 场景管理器 - 管理所有对象和状态
 */

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
        const data = object.serialize();
        // 位移位置
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
            emitters: this.emitters.map(obj => obj.serialize()),
            screens: this.screens.map(obj => obj.serialize()),
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

        import('../objects/VerticalParallelPlateCapacitor.js').then(module => {
            const VerticalParallelPlateCapacitor = module.VerticalParallelPlateCapacitor;

            if (data.electricFields) {
                data.electricFields.forEach(fieldData => {
                    if (fieldData.type === 'vertical-parallel-plate-capacitor') {
                        const field = new VerticalParallelPlateCapacitor(fieldData);
                        field.deserialize(fieldData);
                        this.addObject(field);
                    }
                });
            }
        });
        
        import('../objects/ElectronGun.js').then(module => {
            const ElectronGun = module.ElectronGun;

            if (data.emitters) {
                data.emitters.forEach(emitterData => {
                    if (emitterData.type === 'electron-gun') {
                        const emitter = new ElectronGun(emitterData);
                        emitter.deserialize(emitterData);
                        this.addObject(emitter);
                    }
                });
            }
        });

        import('../objects/FluorescentScreen.js').then(module => {
            const FluorescentScreen = module.FluorescentScreen;

            if (data.screens) {
                data.screens.forEach(screenData => {
                    if (screenData.type === 'fluorescent-screen') {
                        const screen = new FluorescentScreen(screenData);
                        screen.deserialize(screenData);
                        this.addObject(screen);
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
