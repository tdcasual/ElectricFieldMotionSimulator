/**
 * 半圆形电场对象
 */

import { ElectricField } from './ElectricField.js';
import { Vector } from '../physics/VectorMath.js';

export class SemiCircleElectricField extends ElectricField {
    constructor(config = {}) {
        super(config);
        
        this.type = 'semicircle-electric-field';
        this.radius = config.radius || 100;
        this.orientation = config.orientation || 0; // 0=上半圆, 90=右半圆, 180=下半圆, 270=左半圆
    }
    
    /**
     * 获取点处的电场强度
     */
    getFieldAt(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.radius) {
            return new Vector(0, 0, 0);
        }
        
        // 检查点是否在半圆范围内
        if (!this.isInSemiCircle(dx, dy)) {
            return new Vector(0, 0, 0);
        }
        
        // 沿指定方向产生电场
        const angle = this.direction * Math.PI / 180;
        const Ex = this.strength * Math.cos(angle);
        const Ey = this.strength * Math.sin(angle);
        
        return new Vector(Ex, Ey, 0);
    }
    
    /**
     * 检查点是否在半圆区域内
     */
    isInSemiCircle(dx, dy) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.radius) {
            return false;
        }
        
        // 计算点相对于中心的角度
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // 规范化角度到 [0, 360)
        let normalizedAngle = angle >= 0 ? angle : angle + 360;
        let normalizedOrientation = this.orientation >= 0 ? this.orientation : this.orientation + 360;
        
        // 检查是否在半圆内（±90度范围）
        let minAngle = (normalizedOrientation - 90) % 360;
        let maxAngle = (normalizedOrientation + 90) % 360;
        
        if (minAngle < 0) minAngle += 360;
        if (maxAngle < 0) maxAngle += 360;
        
        if (minAngle <= maxAngle) {
            return normalizedAngle >= minAngle && normalizedAngle <= maxAngle;
        } else {
            return normalizedAngle >= minAngle || normalizedAngle <= maxAngle;
        }
    }
    
    /**
     * 检查点是否在形状内
     */
    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= this.radius && this.isInSemiCircle(dx, dy);
    }
    
    /**
     * 序列化对象
     */
    serialize() {
        return {
            ...super.serialize(),
            radius: this.radius,
            orientation: this.orientation,
            color: this.color
        };
    }
    
    /**
     * 反序列化对象
     */
    deserialize(data) {
        super.deserialize(data);
        this.radius = data.radius;
        this.orientation = data.orientation || 0;
        this.color = data.color;
    }
}
