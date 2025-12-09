/**
 * 电子枪：连续发射带电粒子的源
 */

import { BaseObject } from './BaseObject.js';
import { Particle } from './Particle.js';

export class ElectronGun extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.type = 'electron-gun';

        this.direction = config.direction ?? 0; // 发射方向（度），0=向右，90=向下
        this.emissionRate = config.emissionRate ?? 1; // 粒子/秒
        this.emissionSpeed = config.emissionSpeed ?? 200; // 初速度大小（px/s）
        this.barrelLength = config.barrelLength ?? 25; // 发射口偏移

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
        const angle = this.direction * Math.PI / 180;
        const spawnX = this.x + Math.cos(angle) * this.barrelLength;
        const spawnY = this.y + Math.sin(angle) * this.barrelLength;

        const vx = Math.cos(angle) * this.emissionSpeed;
        const vy = Math.sin(angle) * this.emissionSpeed;

        const particle = new Particle({
            x: spawnX,
            y: spawnY,
            vx,
            vy,
            mass: this.particleMass,
            charge: this.particleCharge,
            radius: this.particleRadius,
            ignoreGravity: this.ignoreGravity
        });

        scene.addObject(particle);
    }

    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) <= 18;
    }

    serialize() {
        return {
            ...super.serialize(),
            direction: this.direction,
            emissionRate: this.emissionRate,
            emissionSpeed: this.emissionSpeed,
            barrelLength: this.barrelLength,
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
        this.barrelLength = data.barrelLength ?? 25;
        this.particleType = data.particleType || 'electron';
        this.particleCharge = data.particleCharge ?? -1.602e-19;
        this.particleMass = data.particleMass ?? 9.109e-31;
        this.particleRadius = data.particleRadius ?? 6;
        this.ignoreGravity = data.ignoreGravity ?? true;
    }
}
