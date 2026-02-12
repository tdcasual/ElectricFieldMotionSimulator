/**
 * 带电粒子类
 */

import { BaseObject } from './BaseObject.js';
import { Vector } from '../physics/VectorMath.js';

export class Particle extends BaseObject {
    static defaults() {
        return {
            type: 'particle',
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            vxExpr: null,
            vyExpr: null,
            mass: 9.109e-31,
            charge: -1.602e-19,
            radius: 6,
            ignoreGravity: true,
            showTrajectory: true,
            trajectoryRetention: 'infinite',
            trajectorySeconds: 8,
            maxTrajectoryLength: Infinity,
            showEnergy: true,
            showVelocity: true,
            velocityDisplayMode: 'vector',
            showForces: false,
            showForceElectric: false,
            showForceMagnetic: false,
            showForceGravity: false,
            showForceNet: true
        };
    }

    static schema() {
        return [
            {
                title: '粒子属性',
                fields: [
                    { key: 'mass', label: '质量 (kg)', type: 'number' },
                    { key: 'charge', label: '电荷量 (C)', type: 'number' },
                    { key: 'vx', label: '当前速度 vx (m/s)', type: 'expression', unit: 'm/s', bind: {
                        get: (obj, ctx) => {
                            const expr = typeof obj.vxExpr === 'string' ? obj.vxExpr.trim() : '';
                            if (expr) return expr;
                            const ppm = ctx?.pixelsPerMeter || 1;
                            const vx = Number.isFinite(obj.velocity?.x) ? obj.velocity.x / ppm : 0;
                            return String(vx);
                        },
                        set: (obj, parsed, ctx) => {
                            if (!parsed || parsed.empty) {
                                obj.vxExpr = null;
                                return;
                            }
                            obj.vxExpr = parsed.expr || null;
                            const ppm = ctx?.pixelsPerMeter || 1;
                            if (Number.isFinite(parsed.value)) {
                                obj.velocity.x = parsed.value * ppm;
                            }
                        }
                    } },
                    { key: 'vy', label: '当前速度 vy (m/s)', type: 'expression', unit: 'm/s', bind: {
                        get: (obj, ctx) => {
                            const expr = typeof obj.vyExpr === 'string' ? obj.vyExpr.trim() : '';
                            if (expr) return expr;
                            const ppm = ctx?.pixelsPerMeter || 1;
                            const vy = Number.isFinite(obj.velocity?.y) ? obj.velocity.y / ppm : 0;
                            return String(vy);
                        },
                        set: (obj, parsed, ctx) => {
                            if (!parsed || parsed.empty) {
                                obj.vyExpr = null;
                                return;
                            }
                            obj.vyExpr = parsed.expr || null;
                            const ppm = ctx?.pixelsPerMeter || 1;
                            if (Number.isFinite(parsed.value)) {
                                obj.velocity.y = parsed.value * ppm;
                            }
                        }
                    } },
                    { key: 'radius', label: '半径（质点模式忽略）', type: 'number', min: 0, step: 1 }
                ]
            },
            {
                title: '显示',
                fields: [
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
                    { key: 'showTrajectory', label: '显示轨迹', type: 'checkbox' },
                    { key: 'trajectoryRetention', label: '轨迹保留', type: 'select', options: [
                        { value: 'infinite', label: '永久' },
                        { value: 'seconds', label: '最近 N 秒' }
                    ], enabledWhen: (obj) => !!obj.showTrajectory },
                    { key: 'trajectorySeconds', label: '显示最近 (s)', type: 'number', min: 0.1, step: 0.1,
                        visibleWhen: (obj) => obj.trajectoryRetention === 'seconds' && !!obj.showTrajectory
                    },
                    { key: 'showVelocity', label: '显示速度', type: 'checkbox' },
                    { key: 'velocityDisplayMode', label: '速度显示方式', type: 'select', options: [
                        { value: 'vector', label: '矢量' },
                        { value: 'speed', label: '数值' }
                    ], enabledWhen: (obj) => !!obj.showVelocity },
                    { key: 'showEnergy', label: '显示能量', type: 'checkbox' }
                ]
            },
            {
                title: '受力分析',
                fields: [
                    { key: 'showForces', label: '显示受力', type: 'checkbox' },
                    { key: 'showForceElectric', label: '电场力 Fe', type: 'checkbox', visibleWhen: (obj) => !!obj.showForces },
                    { key: 'showForceMagnetic', label: '磁场力 Fm', type: 'checkbox', visibleWhen: (obj) => !!obj.showForces },
                    { key: 'showForceGravity', label: '重力 Fg', type: 'checkbox', visibleWhen: (obj) => !!obj.showForces },
                    { key: 'showForceNet', label: '合力 ΣF', type: 'checkbox', visibleWhen: (obj) => !!obj.showForces }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'particle';
        
        // 物理属性
        this.position = new Vector(config.x || 0, config.y || 0, 0);
        this.velocity = new Vector(config.vx || 0, config.vy || 0, 0);
        this.mass = config.mass ?? 9.109e-31; // 默认电子质量(kg)
        this.charge = config.charge ?? -1.602e-19; // 默认电子电荷(C)

        // 可选：速度表达式（单位：m/s，UI 使用，按需求值）
        this.vxExpr = typeof config.vxExpr === 'string' ? config.vxExpr : null;
        this.vyExpr = typeof config.vyExpr === 'string' ? config.vyExpr : null;
        
        // 显示属性
        this.radius = config.radius || 6;
        this.ignoreGravity = config.ignoreGravity !== undefined ? config.ignoreGravity : true;
        this.showTrajectory = config.showTrajectory !== undefined ? config.showTrajectory : true;
        this.showEnergy = config.showEnergy !== undefined ? config.showEnergy : true;
        this.showVelocity = config.showVelocity !== undefined ? config.showVelocity : true;
        const velocityMode = config.velocityDisplayMode || config.velocityDisplay || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';

        // 受力分析显示
        this.showForces = config.showForces ?? false;
        this.showForceElectric = config.showForceElectric ?? false;
        this.showForceMagnetic = config.showForceMagnetic ?? false;
        this.showForceGravity = config.showForceGravity ?? false;
        this.showForceNet = config.showForceNet ?? true;
        
        // 轨迹数据
        this.trajectory = [];
        const retention = config.trajectoryRetention;
        this.trajectoryRetention = retention === 'seconds' ? 'seconds' : 'infinite';
        this.trajectorySeconds = Number.isFinite(config.trajectorySeconds) && config.trajectorySeconds > 0
            ? config.trajectorySeconds
            : 8;
        const maxLen = config.maxTrajectoryLength;
        this.maxTrajectoryLength = maxLen === Infinity
            ? Infinity
            : (Number.isFinite(maxLen) && maxLen > 0 ? maxLen : Infinity);
        this._trajectoryHardLimit = 20000;
        
        // 状态
        this.active = true;
        this.stuckToCapacitor = false;
    }
    
    /**
     * 添加轨迹点
     */
    addTrajectoryPoint(x, y, time) {
        const t = Number.isFinite(time)
            ? time
            : (Number.isFinite(this.scene?.time) ? this.scene.time : 0);
        this.trajectory.push({ x, y, t });
        this.pruneTrajectory(t);
    }

    pruneTrajectory(time) {
        const t = Number.isFinite(time)
            ? time
            : (Number.isFinite(this.scene?.time) ? this.scene.time : 0);

        if (this.trajectoryRetention === 'seconds') {
            const seconds = Number.isFinite(this.trajectorySeconds) && this.trajectorySeconds > 0
                ? this.trajectorySeconds
                : 1;
            const cutoff = t - seconds;
            while (this.trajectory.length && (this.trajectory[0]?.t ?? 0) < cutoff) {
                this.trajectory.shift();
            }
        }

        if (Number.isFinite(this.maxTrajectoryLength) && this.maxTrajectoryLength > 0) {
            while (this.trajectory.length > this.maxTrajectoryLength) {
                this.trajectory.shift();
            }
            return;
        }

        this.downsampleTrajectoryIfNeeded();
    }

    downsampleTrajectoryIfNeeded() {
        const hardLimit = Number.isFinite(this._trajectoryHardLimit) ? this._trajectoryHardLimit : 20000;
        if (this.trajectory.length <= hardLimit) return;

        // 保留尾部更高分辨率（最近的点），对更早的点做抽稀，避免内存无限增长。
        while (this.trajectory.length > hardLimit) {
            const keepTail = Math.max(2000, Math.floor(hardLimit * 0.6));
            const tailStart = Math.max(0, this.trajectory.length - keepTail);
            const head = this.trajectory.slice(0, tailStart);
            const tail = this.trajectory.slice(tailStart);
            const sampledHead = [];
            for (let i = 0; i < head.length; i += 2) {
                sampledHead.push(head[i]);
            }
            this.trajectory = sampledHead.concat(tail);
        }
    }
    
    /**
     * 清空轨迹
     */
    clearTrajectory() {
        this.trajectory = [];
    }
    
    /**
     * 计算动能
     */
    getKineticEnergy() {
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : 1;
        const mass = Number.isFinite(this.mass) && this.mass > 0 ? this.mass : 0;
        const vx = (Number.isFinite(this.velocity?.x) ? this.velocity.x : 0) / pixelsPerMeter;
        const vy = (Number.isFinite(this.velocity?.y) ? this.velocity.y : 0) / pixelsPerMeter;
        const v2 = vx * vx + vy * vy;
        return 0.5 * mass * v2;
    }
    
    /**
     * 计算电势能（在匀强电场中）
     */
    getPotentialEnergy(field) {
        // U = qEh (简化计算)
        if (field && field.type === 'electric-field-rect') {
            const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
                ? this.scene.settings.pixelsPerMeter
                : 1;
            const h = (this.position.y - field.y) / pixelsPerMeter;
            return this.charge * field.strength * h;
        }
        return 0;
    }
    
    /**
     * 判断点是否在粒子内
     */
    containsPoint(x, y) {
        const dx = x - this.position.x;
        const dy = y - this.position.y;
        return Math.sqrt(dx * dx + dy * dy) <= 10; // 质点渲染下使用固定点击容差
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            x: this.position.x,
            y: this.position.y,
            position: this.position.toArray(),
            velocity: this.velocity.toArray(),
            vxExpr: this.vxExpr,
            vyExpr: this.vyExpr,
            mass: this.mass,
            charge: this.charge,
            radius: this.radius,
            ignoreGravity: this.ignoreGravity,
            showTrajectory: this.showTrajectory,
            trajectoryRetention: this.trajectoryRetention,
            trajectorySeconds: this.trajectoryRetention === 'seconds' ? this.trajectorySeconds : null,
            showEnergy: this.showEnergy,
            showVelocity: this.showVelocity,
            velocityDisplayMode: this.velocityDisplayMode,
            showForces: this.showForces,
            showForceElectric: this.showForceElectric,
            showForceMagnetic: this.showForceMagnetic,
            showForceGravity: this.showForceGravity,
            showForceNet: this.showForceNet
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        const position = Array.isArray(data.position)
            ? data.position
            : [data.x ?? this.x ?? 0, data.y ?? this.y ?? 0, 0];
        const velocity = Array.isArray(data.velocity)
            ? data.velocity
            : [data.vx ?? 0, data.vy ?? 0, 0];

        this.position = Vector.fromArray(position);
        this.velocity = Vector.fromArray(velocity);
        this.x = this.position.x;
        this.y = this.position.y;
        this.vxExpr = typeof data.vxExpr === 'string' ? data.vxExpr : (this.vxExpr ?? null);
        this.vyExpr = typeof data.vyExpr === 'string' ? data.vyExpr : (this.vyExpr ?? null);
        this.mass = data.mass ?? this.mass;
        this.charge = data.charge ?? this.charge;
        this.radius = data.radius ?? this.radius;
        this.ignoreGravity = data.ignoreGravity ?? this.ignoreGravity;
        this.showTrajectory = data.showTrajectory ?? this.showTrajectory;
        this.trajectoryRetention = data.trajectoryRetention === 'seconds' ? 'seconds' : (this.trajectoryRetention || 'infinite');
        this.trajectorySeconds = Number.isFinite(data.trajectorySeconds) && data.trajectorySeconds > 0
            ? data.trajectorySeconds
            : (this.trajectorySeconds ?? 8);
        this.showEnergy = data.showEnergy ?? this.showEnergy;
        this.showVelocity = data.showVelocity ?? this.showVelocity;
        const velocityMode = data.velocityDisplayMode || data.velocityDisplay || this.velocityDisplayMode || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';
        this.showForces = data.showForces ?? this.showForces ?? false;
        this.showForceElectric = data.showForceElectric ?? this.showForceElectric ?? false;
        this.showForceMagnetic = data.showForceMagnetic ?? this.showForceMagnetic ?? false;
        this.showForceGravity = data.showForceGravity ?? this.showForceGravity ?? false;
        this.showForceNet = data.showForceNet ?? this.showForceNet ?? true;
    }
}
