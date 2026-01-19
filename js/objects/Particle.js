/**
 * 带电粒子类
 */

import { BaseObject } from './BaseObject.js';
import { Vector } from '../physics/VectorMath.js';

export class Particle extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.type = 'particle';
        
        // 物理属性
        this.position = new Vector(config.x || 0, config.y || 0, 0);
        this.velocity = new Vector(config.vx || 0, config.vy || 0, 0);
        this.mass = config.mass ?? 9.109e-31; // 默认电子质量(kg)
        this.charge = config.charge ?? -1.602e-19; // 默认电子电荷(C)
        
        // 显示属性
        this.radius = config.radius || 6;
        this.ignoreGravity = config.ignoreGravity !== undefined ? config.ignoreGravity : true;
        this.showTrajectory = config.showTrajectory !== undefined ? config.showTrajectory : true;
        this.showEnergy = config.showEnergy !== undefined ? config.showEnergy : true;
        this.showVelocity = config.showVelocity !== undefined ? config.showVelocity : true;
        const velocityMode = config.velocityDisplayMode || config.velocityDisplay || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';
        
        // 轨迹数据
        this.trajectory = [];
        const maxLen = config.maxTrajectoryLength;
        this.maxTrajectoryLength = maxLen === Infinity
            ? Infinity
            : (Number.isFinite(maxLen) && maxLen > 0 ? maxLen : 500);
        
        // 状态
        this.active = true;
        this.stuckToCapacitor = false;
    }
    
    /**
     * 添加轨迹点
     */
    addTrajectoryPoint(x, y) {
        this.trajectory.push({ x, y });
        if (this.trajectory.length > this.maxTrajectoryLength) {
            this.trajectory.shift();
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
        const v = this.velocity.magnitude() / pixelsPerMeter;
        return 0.5 * this.mass * v * v;
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
        return Math.sqrt(dx * dx + dy * dy) <= this.radius + 5; // 增加5px点击容差
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
            mass: this.mass,
            charge: this.charge,
            radius: this.radius,
            ignoreGravity: this.ignoreGravity,
            showTrajectory: this.showTrajectory,
            showEnergy: this.showEnergy,
            showVelocity: this.showVelocity,
            velocityDisplayMode: this.velocityDisplayMode
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
        this.mass = data.mass ?? this.mass;
        this.charge = data.charge ?? this.charge;
        this.radius = data.radius ?? this.radius;
        this.ignoreGravity = data.ignoreGravity ?? this.ignoreGravity;
        this.showTrajectory = data.showTrajectory ?? this.showTrajectory;
        this.showEnergy = data.showEnergy ?? this.showEnergy;
        this.showVelocity = data.showVelocity ?? this.showVelocity;
        const velocityMode = data.velocityDisplayMode || data.velocityDisplay || this.velocityDisplayMode || 'vector';
        this.velocityDisplayMode = velocityMode === 'speed' ? 'speed' : 'vector';
    }
}
