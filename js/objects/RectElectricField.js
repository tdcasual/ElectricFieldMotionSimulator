/**
 * 矩形均匀电场
 */

import { ElectricField } from './ElectricField.js';

export class RectElectricField extends ElectricField {
    constructor(config = {}) {
        super(config);
        this.type = 'electric-field-rect';
        this.width = config.width || 200;
        this.height = config.height || 150;
    }
    
    /**
     * 获取指定位置的电场强度
     */
    getFieldAt(x, y) {
        // 检查点是否在矩形内
        if (x < this.x || x > this.x + this.width ||
            y < this.y || y > this.y + this.height) {
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
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            width: this.width,
            height: this.height
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.width = data.width;
        this.height = data.height;
    }
}
