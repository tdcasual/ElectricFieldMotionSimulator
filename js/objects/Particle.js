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
        this.mass = config.mass || 9.109e-31; // 默认电子质量(kg)
        this.charge = config.charge || -1.602e-19; // 默认电子电荷(C)
        
        // 显示属性
        this.radius = config.radius || 6;
        this.ignoreGravity = config.ignoreGravity !== undefined ? config.ignoreGravity : true;
        this.showTrajectory = config.showTrajectory !== undefined ? config.showTrajectory : true;
        this.showEnergy = config.showEnergy !== undefined ? config.showEnergy : true;
        
        // 轨迹数据
        this.trajectory = [];
        this.maxTrajectoryLength = 500;
        
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
        const v = this.velocity.magnitude();
        return 0.5 * this.mass * v * v;
    }
    
    /**
     * 计算电势能（在匀强电场中）
     */
    getPotentialEnergy(field) {
        // U = qEh (简化计算)
        if (field && field.type === 'electric-field-rect') {
            const h = this.position.y - field.y;
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
            position: this.position.toArray(),
            velocity: this.velocity.toArray(),
            mass: this.mass,
            charge: this.charge,
            radius: this.radius,
            ignoreGravity: this.ignoreGravity,
            showTrajectory: this.showTrajectory,
            showEnergy: this.showEnergy
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.position = Vector.fromArray(data.position);
        this.velocity = Vector.fromArray(data.velocity);
        this.mass = data.mass;
        this.charge = data.charge;
        this.radius = data.radius;
        this.ignoreGravity = data.ignoreGravity;
        this.showTrajectory = data.showTrajectory;
        this.showEnergy = data.showEnergy;
    }
}
