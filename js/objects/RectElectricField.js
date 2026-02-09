/**
 * 矩形均匀电场
 */

import { ElectricField } from './ElectricField.js';

export class RectElectricField extends ElectricField {
    static defaults() {
        return {
            type: 'electric-field-rect',
            x: 0,
            y: 0,
            width: 200,
            height: 150,
            strength: 1000,
            direction: 90
        };
    }

    static schema() {
        return [
            {
                title: '电场属性',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'width', label: '宽度', type: 'number', min: 1, step: 10 },
                    { key: 'height', label: '高度', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '场强 (N/C)', type: 'number', step: 100 },
                    { key: 'direction', label: '方向 (度)', type: 'number', min: 0, max: 360 }
                ]
            }
        ];
    }

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
