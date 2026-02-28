/**
 * 电子枪：连续发射带电粒子的源
 */

import { BaseObject } from './BaseObject.js';
import { Particle } from './Particle.js';

export class ElectronGun extends BaseObject {
    static defaults() {
        return {
            type: 'electron-gun',
            x: 0,
            y: 0,
            direction: 0,
            emissionRate: 1,
            emissionSpeed: 200,
            showVelocity: false,
            velocityDisplayMode: 'vector',
            showEnergy: false,
            particleType: 'electron',
            particleCharge: -1.602e-19,
            particleMass: 9.109e-31,
            particleRadius: 6,
            ignoreGravity: true
        };
    }

    static schema() {
        return [
            {
                title: '基础',
                group: 'basic',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'direction', label: '发射方向 (度)', type: 'number', min: 0, max: 360 },
                    { key: 'emissionRate', label: '发射频率 (个/秒)', type: 'number', min: 0, step: 0.5 },
                    { key: 'emissionSpeed', label: '发射初速度 (m/s)', type: 'number', min: 0, step: 10, bind: {
                        get: (obj, ctx) => {
                            const ppm = ctx?.pixelsPerMeter || 1;
                            return (Number.isFinite(obj.emissionSpeed) ? obj.emissionSpeed : 0) / ppm;
                        },
                        set: (obj, value, ctx) => {
                            const ppm = ctx?.pixelsPerMeter || 1;
                            if (Number.isFinite(value) && value >= 0) {
                                obj.emissionSpeed = value * ppm;
                            }
                        }
                    } }
                ]
            },
            {
                title: '粒子模板',
                group: 'basic',
                fields: [
                    { key: 'particleType', label: '粒子类型', type: 'select', options: [
                        { value: 'electron', label: '电子' },
                        { value: 'proton', label: '质子' },
                        { value: 'alpha', label: 'α粒子' },
                        { value: 'custom', label: '自定义' }
                    ], bind: {
                        get: (obj) => obj.particleType || 'electron',
                        set: (obj, value) => {
                            obj.particleType = value;
                            const preset = obj.constructor?.PARTICLE_PRESETS?.[value];
                            if (preset) {
                                obj.particleCharge = preset.charge;
                                obj.particleMass = preset.mass;
                            }
                        }
                    } },
                    { key: 'particleCharge', label: '粒子电荷 (C)', type: 'number', step: 1e-20 },
                    { key: 'particleMass', label: '粒子质量 (kg)', type: 'number', step: 1e-30 },
                    { key: 'particleRadius', label: '粒子半径（质点模式忽略）', type: 'number', min: 0, step: 1 },
                    { key: 'ignoreGravity', label: '忽略重力', type: 'checkbox' },
                    { key: 'gravity', label: '重力加速度 g (m/s²)', type: 'number', min: 0, step: 0.1,
                        enabledWhen: (obj) => !obj.ignoreGravity,
                        bind: {
                            get: (obj, ctx) => ctx?.scene?.settings?.gravity ?? 10,
                            set: (obj, value, ctx) => {
                                if (!ctx?.scene?.settings) return;
                                if (Number.isFinite(value) && value >= 0) {
                                    ctx.scene.settings.gravity = value;
                                }
                            }
                        }
                    }
                ]
            },
            {
                title: '显示与调试',
                group: 'advanced',
                defaultCollapsed: true,
                fields: [
                    { key: 'showVelocity', label: '显示发射速度', type: 'checkbox' },
                    { key: 'velocityDisplayMode', label: '速度显示方式', type: 'select', options: [
                        { value: 'vector', label: '矢量' },
                        { value: 'speed', label: '数值' }
                    ], enabledWhen: (obj) => !!obj.showVelocity },
                    { key: 'showEnergy', label: '显示能量', type: 'checkbox' }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'electron-gun';

        this.direction = config.direction ?? 0; // 发射方向（度），0=向右，90=向下
        this.emissionRate = config.emissionRate ?? 1; // 粒子/秒
        this.emissionSpeed = config.emissionSpeed ?? 200; // 初速度大小（px/s）

        // 显示配置（用于画布叠加信息）
        this.showVelocity = config.showVelocity ?? false;
        const velocityMode = config.velocityDisplayMode || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';
        this.showEnergy = config.showEnergy ?? false;

        this.particleType = config.particleType || 'electron';
        this.particleCharge = config.particleCharge ?? -1.602e-19;
        this.particleMass = config.particleMass ?? 9.109e-31;
        this.particleRadius = config.particleRadius ?? 6;
        this.ignoreGravity = config.ignoreGravity ?? true;

        this._emitAccumulator = 0;

        // 如果是预设类型，按预设刷新电荷/质量
        this.applyPresetIfNeeded(this.particleType, !!(config.particleCharge === undefined && config.particleMass === undefined));
    }

    static PARTICLE_PRESETS = {
        electron: { charge: -1.602e-19, mass: 9.109e-31, label: '电子' },
        proton: { charge: 1.602e-19, mass: 1.672e-27, label: '质子' },
        alpha: { charge: 3.204e-19, mass: 6.644e-27, label: 'α粒子' }
    };

    applyPresetIfNeeded(type, overwrite = false) {
        const preset = ElectronGun.PARTICLE_PRESETS[type];
        if (preset && overwrite) {
            this.particleCharge = preset.charge;
            this.particleMass = preset.mass;
        }
    }

    update(dt, scene) {
        if (this.emissionRate <= 0 || !scene) return;

        const interval = 1 / this.emissionRate;
        this._emitAccumulator += dt;

        while (this._emitAccumulator >= interval) {
            this._emitAccumulator -= interval;
            this.emitParticle(scene);
        }
    }

    emitParticle(scene) {
        const baseX = Number.isFinite(this.x) ? this.x : null;
        const baseY = Number.isFinite(this.y) ? this.y : null;
        if (baseX === null || baseY === null) return;

        const angleDeg = Number.isFinite(this.direction) ? this.direction : 0;
        const angle = angleDeg * Math.PI / 180;
        const speed = Number.isFinite(this.emissionSpeed) ? this.emissionSpeed : 0;

        const spawnX = baseX;
        const spawnY = baseY;

        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        if (!Number.isFinite(spawnX) || !Number.isFinite(spawnY) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
            return;
        }

        const mass = Number.isFinite(this.particleMass) && this.particleMass > 0 ? this.particleMass : null;
        if (mass === null) return;
        const charge = Number.isFinite(this.particleCharge) ? this.particleCharge : 0;
        const radius = Number.isFinite(this.particleRadius) && this.particleRadius > 0 ? this.particleRadius : 6;

        const particle = new Particle({
            x: spawnX,
            y: spawnY,
            vx,
            vy,
            mass,
            charge,
            radius,
            ignoreGravity: this.ignoreGravity
        });

        scene.addObject(particle);
    }

    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= 24;
    }

    serialize() {
        return {
            ...super.serialize(),
            direction: this.direction,
            emissionRate: this.emissionRate,
            emissionSpeed: this.emissionSpeed,
            showVelocity: this.showVelocity,
            velocityDisplayMode: this.velocityDisplayMode,
            showEnergy: this.showEnergy,
            particleType: this.particleType,
            particleCharge: this.particleCharge,
            particleMass: this.particleMass,
            particleRadius: this.particleRadius,
            ignoreGravity: this.ignoreGravity
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.direction = data.direction ?? 0;
        this.emissionRate = data.emissionRate ?? 0;
        this.emissionSpeed = data.emissionSpeed ?? 0;
        this.showVelocity = data.showVelocity ?? this.showVelocity ?? false;
        const velocityMode = data.velocityDisplayMode || this.velocityDisplayMode || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';
        this.showEnergy = data.showEnergy ?? this.showEnergy ?? false;
        this.particleType = data.particleType || 'electron';
        this.particleCharge = data.particleCharge ?? -1.602e-19;
        this.particleMass = data.particleMass ?? 9.109e-31;
        this.particleRadius = data.particleRadius ?? 6;
        this.ignoreGravity = data.ignoreGravity ?? true;
    }
}
