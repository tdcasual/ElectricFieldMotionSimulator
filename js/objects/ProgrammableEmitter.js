/**
 * 可编程粒子发射器：按时间计划发射带电粒子
 */

import { BaseObject } from './BaseObject.js';
import { Particle } from './Particle.js';

export class ProgrammableEmitter extends BaseObject {
    static defaults() {
        return {
            type: 'programmable-emitter',
            x: 0,
            y: 0,
            direction: 0,
            emissionSpeed: 200,
            barrelLength: 25,
            startTime: 0,
            emissionMode: 'burst',
            emissionCount: 6,
            emissionInterval: 0.2,
            timeList: [],
            angleMode: 'fixed',
            angleMin: 0,
            angleMax: 360,
            angleList: [],
            angleListMode: 'sequential',
            angleListLoop: true,
            speedMode: 'fixed',
            speedMin: 200,
            speedMax: 200,
            speedList: [],
            speedListMode: 'sequential',
            speedListLoop: true,
            particleType: 'electron',
            particleCharge: -1.602e-19,
            particleMass: 9.109e-31,
            particleRadius: 6,
            ignoreGravity: true,
            keepTrajectory: true
        };
    }

    static schema() {
        const parseNumberList = (raw) => String(raw ?? '')
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .map(item => (Number.isFinite(Number(item)) ? Number(item) : null))
            .filter(item => item !== null);

        const bindSpeed = (prop) => ({
            get: (obj, ctx) => {
                const ppm = ctx?.pixelsPerMeter || 1;
                const raw = Number.isFinite(obj[prop]) ? obj[prop] : 0;
                return raw / ppm;
            },
            set: (obj, value, ctx) => {
                const ppm = ctx?.pixelsPerMeter || 1;
                if (Number.isFinite(value) && value >= 0) {
                    obj[prop] = value * ppm;
                }
            }
        });

        const bindList = (prop, options = {}) => ({
            get: (obj, ctx) => {
                const ppm = ctx?.pixelsPerMeter || 1;
                const list = Array.isArray(obj[prop]) ? obj[prop] : [];
                const factor = options.scale === 'ppm' ? ppm : 1;
                return list.map((v) => (Number.isFinite(v) ? v / factor : 0)).join(', ');
            },
            set: (obj, value, ctx) => {
                const ppm = ctx?.pixelsPerMeter || 1;
                const list = parseNumberList(value);
                const factor = options.scale === 'ppm' ? ppm : 1;
                const min = Number.isFinite(options.clampMin) ? options.clampMin : null;
                obj[prop] = list.map((v) => {
                    const next = min === null ? v : Math.max(min, v);
                    return next * factor;
                });
            }
        });

        return [
            {
                title: '基础',
                group: 'basic',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'direction', label: '方向 (度)', type: 'number', min: 0, max: 360 }
                ]
            },
            {
                title: '发射时序',
                group: 'basic',
                fields: [
                    { key: 'startTime', label: '开始时间 (s)', type: 'number', min: 0, step: 0.1 },
                    { key: 'emissionMode', label: '发射模式', type: 'select', options: [
                        { value: 'burst', label: '一次性' },
                        { value: 'sequence', label: '等间隔' },
                        { value: 'time-list', label: '时间列表' }
                    ] },
                    { key: 'emissionCount', label: '发射数量', type: 'number', min: 0, step: 1 },
                    { key: 'emissionInterval', label: '发射间隔 (s)', type: 'number', min: 0, step: 0.05,
                        visibleWhen: (obj) => obj.emissionMode === 'sequence'
                    },
                    { key: 'timeList', label: '时间列表', type: 'text', multiline: true, rows: 2, bind: bindList('timeList', { clampMin: 0 }),
                        visibleWhen: (obj) => obj.emissionMode === 'time-list'
                    }
                ]
            },
            {
                title: '速度规划',
                group: 'advanced',
                defaultCollapsed: true,
                fields: [
                    { key: 'speedMode', label: '速度模式', type: 'select', options: [
                        { value: 'fixed', label: '固定' },
                        { value: 'random', label: '随机' },
                        { value: 'list', label: '列表' },
                        { value: 'arithmetic', label: '等差' }
                    ] },
                    { key: 'emissionSpeed', label: '默认速度 (m/s)', type: 'number', min: 0, step: 10, bind: bindSpeed('emissionSpeed'),
                        visibleWhen: (obj) => obj.speedMode === 'fixed'
                    },
                    { key: 'speedMin', label: '最小速度 (m/s)', type: 'number', min: 0, step: 10, bind: bindSpeed('speedMin'),
                        visibleWhen: (obj) => obj.speedMode === 'random' || obj.speedMode === 'arithmetic'
                    },
                    { key: 'speedMax', label: '最大速度 (m/s)', type: 'number', min: 0, step: 10, bind: bindSpeed('speedMax'),
                        visibleWhen: (obj) => obj.speedMode === 'random' || obj.speedMode === 'arithmetic'
                    },
                    { key: 'speedList', label: '速度列表', type: 'text', multiline: true, rows: 2, bind: bindList('speedList', { scale: 'ppm', clampMin: 0 }),
                        visibleWhen: (obj) => obj.speedMode === 'list'
                    },
                    { key: 'speedListMode', label: '列表模式', type: 'select', options: [
                        { value: 'sequential', label: '顺序' },
                        { value: 'random', label: '随机' }
                    ], visibleWhen: (obj) => obj.speedMode === 'list' },
                    { key: 'speedListLoop', label: '循环列表', type: 'checkbox',
                        visibleWhen: (obj) => obj.speedMode === 'list'
                    }
                ]
            },
            {
                title: '角度规划',
                group: 'advanced',
                defaultCollapsed: true,
                fields: [
                    { key: 'angleMode', label: '角度模式', type: 'select', options: [
                        { value: 'fixed', label: '固定' },
                        { value: 'random', label: '随机' },
                        { value: 'list', label: '列表' }
                    ] },
                    { key: 'angleMin', label: '最小角度', type: 'number', step: 1,
                        visibleWhen: (obj) => obj.angleMode === 'random'
                    },
                    { key: 'angleMax', label: '最大角度', type: 'number', step: 1,
                        visibleWhen: (obj) => obj.angleMode === 'random'
                    },
                    { key: 'angleList', label: '角度列表', type: 'text', multiline: true, rows: 2, bind: bindList('angleList'),
                        visibleWhen: (obj) => obj.angleMode === 'list'
                    },
                    { key: 'angleListMode', label: '列表模式', type: 'select', options: [
                        { value: 'sequential', label: '顺序' },
                        { value: 'random', label: '随机' }
                    ], visibleWhen: (obj) => obj.angleMode === 'list' },
                    { key: 'angleListLoop', label: '循环列表', type: 'checkbox',
                        visibleWhen: (obj) => obj.angleMode === 'list'
                    }
                ]
            },
            {
                title: '粒子模板',
                group: 'advanced',
                defaultCollapsed: true,
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
                    },
                    { key: 'keepTrajectory', label: '保留轨迹', type: 'checkbox' }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'programmable-emitter';

        // 发射位置与几何
        this.direction = config.direction ?? 0; // 度，0=向右，90=向下
        this.emissionSpeed = config.emissionSpeed ?? 200; // px/s
        this.barrelLength = config.barrelLength ?? 25; // 兼容字段：点发射模式下不再影响发射位置

        // 时间计划
        this.startTime = config.startTime ?? 0; // s
        this.emissionMode = config.emissionMode || 'burst'; // burst | sequence | time-list
        this.emissionCount = config.emissionCount ?? 6;
        this.emissionInterval = config.emissionInterval ?? 0.2; // s（sequence 模式）
        this.timeList = Array.isArray(config.timeList) ? config.timeList : [];

        // 角度计划
        this.angleMode = config.angleMode || 'fixed'; // fixed | random | list
        this.angleMin = config.angleMin ?? 0;
        this.angleMax = config.angleMax ?? 360;
        this.angleList = Array.isArray(config.angleList) ? config.angleList : [];
        this.angleListMode = config.angleListMode || 'sequential'; // sequential | random
        this.angleListLoop = config.angleListLoop ?? true;

        // 初速度计划（单位：px/s）
        this.speedMode = config.speedMode || 'fixed'; // fixed | random | list | arithmetic
        this.speedMin = config.speedMin ?? this.emissionSpeed;
        this.speedMax = config.speedMax ?? this.emissionSpeed;
        this.speedList = Array.isArray(config.speedList) ? config.speedList : [];
        this.speedListMode = config.speedListMode || 'sequential'; // sequential | random
        this.speedListLoop = config.speedListLoop ?? true;

        // 粒子模板
        this.particleType = config.particleType || 'electron';
        this.particleCharge = config.particleCharge ?? -1.602e-19;
        this.particleMass = config.particleMass ?? 9.109e-31;
        this.particleRadius = config.particleRadius ?? 6;
        this.ignoreGravity = config.ignoreGravity ?? true;
        this.keepTrajectory = config.keepTrajectory ?? true;

        this._emittedCount = 0;
        this._burstDone = false;
        this._timeListIndex = 0;
        this._angleIndex = 0;
        this._speedIndex = 0;

        this.applyPresetIfNeeded(
            this.particleType,
            !!(config.particleCharge === undefined && config.particleMass === undefined)
        );
    }

    static PARTICLE_PRESETS = {
        electron: { charge: -1.602e-19, mass: 9.109e-31, label: '电子' },
        proton: { charge: 1.602e-19, mass: 1.672e-27, label: '质子' },
        alpha: { charge: 3.204e-19, mass: 6.644e-27, label: 'α粒子' }
    };

    applyPresetIfNeeded(type, overwrite = false) {
        const preset = ProgrammableEmitter.PARTICLE_PRESETS[type];
        if (preset && overwrite) {
            this.particleCharge = preset.charge;
            this.particleMass = preset.mass;
        }
    }

    resetRuntime() {
        this._emittedCount = 0;
        this._burstDone = false;
        this._timeListIndex = 0;
        this._angleIndex = 0;
        this._speedIndex = 0;
    }

    update(dt, scene) {
        if (!scene) return;
        if (!Number.isFinite(dt) || dt <= 0) return;

        const totalCount = Math.max(0, Math.floor(this.emissionCount));
        if (totalCount <= 0) return;

        const now = Number.isFinite(scene.time) ? scene.time : 0;
        const startTime = Number.isFinite(this.startTime) ? this.startTime : 0;
        const plannedCount = this.emissionMode === 'time-list'
            ? Math.min(totalCount, this.getTimeOffsets().length)
            : totalCount;

        if (this.emissionMode === 'burst') {
            if (this._burstDone) return;
            if (now < startTime) return;
            for (let i = 0; i < totalCount; i++) {
                this.emitParticle(scene, plannedCount);
                this._emittedCount++;
            }
            this._burstDone = true;
            return;
        }

        if (this.emissionMode === 'sequence') {
            const interval = Number.isFinite(this.emissionInterval) ? this.emissionInterval : 0;
            if (interval <= 0) {
                // 退化为 burst
                if (!this._burstDone && now >= startTime) {
                    for (let i = 0; i < totalCount; i++) {
                        this.emitParticle(scene, plannedCount);
                        this._emittedCount++;
                    }
                    this._burstDone = true;
                }
                return;
            }

            while (this._emittedCount < totalCount) {
                const emitTime = startTime + this._emittedCount * interval;
                if (emitTime > now) break;
                this.emitParticle(scene, plannedCount);
                this._emittedCount++;
            }
            return;
        }

        if (this.emissionMode === 'time-list') {
            const offsets = this.getTimeOffsets();
            while (this._emittedCount < totalCount && this._timeListIndex < offsets.length) {
                const emitTime = startTime + offsets[this._timeListIndex];
                if (emitTime > now) break;
                this.emitParticle(scene, plannedCount);
                this._emittedCount++;
                this._timeListIndex++;
            }
        }
    }

    getTimeOffsets() {
        const raw = Array.isArray(this.timeList) ? this.timeList : [];
        const offsets = raw
            .map(value => (typeof value === 'string' ? parseFloat(value) : value))
            .filter(value => Number.isFinite(value))
            .map(value => Math.max(0, value));
        offsets.sort((a, b) => a - b);
        return offsets;
    }

    pickAngleDeg() {
        if (this.angleMode === 'random') {
            let a = Number.isFinite(this.angleMin) ? this.angleMin : 0;
            let b = Number.isFinite(this.angleMax) ? this.angleMax : 360;
            if (b < a) [a, b] = [b, a];
            return a + Math.random() * (b - a);
        }

        if (this.angleMode === 'list') {
            const list = Array.isArray(this.angleList) ? this.angleList : [];
            const cleaned = list
                .map(value => (typeof value === 'string' ? parseFloat(value) : value))
                .filter(value => Number.isFinite(value));
            if (!cleaned.length) {
                return Number.isFinite(this.direction) ? this.direction : 0;
            }

            if (this.angleListMode === 'random') {
                const idx = Math.floor(Math.random() * cleaned.length);
                return cleaned[Math.max(0, Math.min(cleaned.length - 1, idx))];
            }

            const idx = this._angleIndex;
            if (idx >= cleaned.length) {
                if (this.angleListLoop) {
                    this._angleIndex = 1;
                    return cleaned[0];
                }
                return cleaned[cleaned.length - 1];
            }

            this._angleIndex += 1;
            return cleaned[idx];
        }

        return Number.isFinite(this.direction) ? this.direction : 0;
    }

    pickSpeedPx(plannedCount) {
        const fallback = Number.isFinite(this.emissionSpeed) ? this.emissionSpeed : 0;

        if (this.speedMode === 'random' || this.speedMode === 'arithmetic') {
            let min = Number.isFinite(this.speedMin) ? this.speedMin : fallback;
            let max = Number.isFinite(this.speedMax) ? this.speedMax : fallback;
            min = Math.max(0, min);
            max = Math.max(0, max);
            if (max < min) [min, max] = [max, min];

            if (this.speedMode === 'random') {
                return min + Math.random() * (max - min);
            }

            const count = Number.isFinite(plannedCount) ? Math.max(1, Math.floor(plannedCount)) : 1;
            if (count <= 1) return min;
            const i = Math.max(0, Math.min(count - 1, this._emittedCount));
            const step = (max - min) / (count - 1);
            return min + step * i;
        }

        if (this.speedMode === 'list') {
            const list = Array.isArray(this.speedList) ? this.speedList : [];
            const cleaned = list
                .map(value => (typeof value === 'string' ? parseFloat(value) : value))
                .filter(value => Number.isFinite(value))
                .map(value => Math.max(0, value));
            if (!cleaned.length) {
                return fallback;
            }

            if (this.speedListMode === 'random') {
                const idx = Math.floor(Math.random() * cleaned.length);
                return cleaned[Math.max(0, Math.min(cleaned.length - 1, idx))];
            }

            const idx = this._speedIndex;
            if (idx >= cleaned.length) {
                if (this.speedListLoop) {
                    this._speedIndex = 1;
                    return cleaned[0];
                }
                return cleaned[cleaned.length - 1];
            }

            this._speedIndex += 1;
            return cleaned[idx];
        }

        return fallback;
    }

    emitParticle(scene, plannedCount) {
        const baseX = Number.isFinite(this.x) ? this.x : null;
        const baseY = Number.isFinite(this.y) ? this.y : null;
        if (baseX === null || baseY === null) return;

        const angleDeg = this.pickAngleDeg();
        const angle = angleDeg * Math.PI / 180;

        const spawnX = baseX;
        const spawnY = baseY;

        const speed = this.pickSpeedPx(plannedCount);
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
            ignoreGravity: this.ignoreGravity,
            showTrajectory: this.keepTrajectory,
            maxTrajectoryLength: Infinity
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
            emissionSpeed: this.emissionSpeed,
            barrelLength: this.barrelLength,
            startTime: this.startTime,
            emissionMode: this.emissionMode,
            emissionCount: this.emissionCount,
            emissionInterval: this.emissionInterval,
            timeList: this.timeList,
            angleMode: this.angleMode,
            angleMin: this.angleMin,
            angleMax: this.angleMax,
            angleList: this.angleList,
            angleListMode: this.angleListMode,
            angleListLoop: this.angleListLoop,
            speedMode: this.speedMode,
            speedMin: this.speedMin,
            speedMax: this.speedMax,
            speedList: this.speedList,
            speedListMode: this.speedListMode,
            speedListLoop: this.speedListLoop,
            particleType: this.particleType,
            particleCharge: this.particleCharge,
            particleMass: this.particleMass,
            particleRadius: this.particleRadius,
            ignoreGravity: this.ignoreGravity,
            keepTrajectory: this.keepTrajectory
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.direction = data.direction ?? this.direction ?? 0;
        this.emissionSpeed = data.emissionSpeed ?? this.emissionSpeed ?? 0;
        this.barrelLength = data.barrelLength ?? this.barrelLength ?? 25;
        this.startTime = data.startTime ?? this.startTime ?? 0;
        this.emissionMode = data.emissionMode || this.emissionMode || 'burst';
        this.emissionCount = data.emissionCount ?? this.emissionCount ?? 0;
        this.emissionInterval = data.emissionInterval ?? this.emissionInterval ?? 0.2;
        this.timeList = Array.isArray(data.timeList) ? data.timeList : this.timeList ?? [];
        this.angleMode = data.angleMode || this.angleMode || 'fixed';
        this.angleMin = data.angleMin ?? this.angleMin ?? 0;
        this.angleMax = data.angleMax ?? this.angleMax ?? 360;
        this.angleList = Array.isArray(data.angleList) ? data.angleList : this.angleList ?? [];
        this.angleListMode = data.angleListMode || this.angleListMode || 'sequential';
        this.angleListLoop = data.angleListLoop ?? this.angleListLoop ?? true;
        this.speedMode = data.speedMode || this.speedMode || 'fixed';
        this.speedMin = data.speedMin ?? this.speedMin ?? this.emissionSpeed;
        this.speedMax = data.speedMax ?? this.speedMax ?? this.emissionSpeed;
        this.speedList = Array.isArray(data.speedList) ? data.speedList : this.speedList ?? [];
        this.speedListMode = data.speedListMode || this.speedListMode || 'sequential';
        this.speedListLoop = data.speedListLoop ?? this.speedListLoop ?? true;
        this.particleType = data.particleType || this.particleType || 'electron';
        this.particleCharge = data.particleCharge ?? this.particleCharge ?? -1.602e-19;
        this.particleMass = data.particleMass ?? this.particleMass ?? 9.109e-31;
        this.particleRadius = data.particleRadius ?? this.particleRadius ?? 6;
        this.ignoreGravity = data.ignoreGravity ?? this.ignoreGravity ?? true;
        this.keepTrajectory = data.keepTrajectory ?? this.keepTrajectory ?? true;
        this.resetRuntime();
    }
}
