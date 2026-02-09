/**
 * 圆形均匀电场
 */

import { ElectricField } from './ElectricField.js';

export class CircleElectricField extends ElectricField {
    static defaults() {
        return {
            type: 'electric-field-circle',
            x: 0,
            y: 0,
            radius: 100,
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
                    { key: 'radius', label: '半径', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '场强 (N/C)', type: 'number', step: 100 },
                    { key: 'direction', label: '方向 (度)', type: 'number', min: 0, max: 360 }
                ]
            }
        ];
    }

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
