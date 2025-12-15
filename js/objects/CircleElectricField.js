/**
 * 圆形均匀电场
 */

import { ElectricField } from './ElectricField.js';

export class CircleElectricField extends ElectricField {
    constructor(config = {}) {
        super(config);
        this.type = 'electric-field-circle';
        this.radius = config.radius || 100;
    }
    
    /**
     * 获取指定位置的电场强度
     */
    getFieldAt(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distSquared = dx * dx + dy * dy;
        
        // 检查点是否在圆内
        if (distSquared > this.radius * this.radius) {
            return { x: 0, y: 0 };
        }
        
        // 均匀电场
        const angleRad = this.direction * Math.PI / 180;
        return {
            x: this.strength * Math.cos(angleRad),
            y: this.strength * Math.sin(angleRad)
        };
    }
    
    /**
     * 判断点是否在对象内
     */
    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            radius: this.radius
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.radius = data.radius;
    }
}
