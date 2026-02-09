/**
 * 磁场类
 */

import { BaseObject } from './BaseObject.js';

export class MagneticField extends BaseObject {
    static defaults() {
        return {
            type: 'magnetic-field',
            x: 0,
            y: 0,
            shape: 'rect',
            width: 200,
            height: 150,
            radius: 90,
            strength: 0.5
        };
    }

    static schema() {
        return [
            {
                title: '磁场属性',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'shape', label: '形状', type: 'select', options: [
                        { value: 'rect', label: '矩形' },
                        { value: 'circle', label: '圆形' },
                        { value: 'triangle', label: '三角形' }
                    ] },
                    { key: 'width', label: '宽度', type: 'number', min: 1, step: 10,
                        visibleWhen: (obj) => obj.shape !== 'circle'
                    },
                    { key: 'height', label: '高度', type: 'number', min: 1, step: 10,
                        visibleWhen: (obj) => obj.shape !== 'circle'
                    },
                    { key: 'radius', label: '半径', type: 'number', min: 1, step: 10,
                        visibleWhen: (obj) => obj.shape === 'circle'
                    },
                    { key: 'strength', label: '磁感应强度 (T)', type: 'number', step: 0.1 }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'magnetic-field';
        this.shape = config.shape || 'rect'; // rect | circle | triangle
        this.width = config.width ?? (config.radius ? config.radius * 2 : 200);
        this.height = config.height ?? (config.radius ? config.radius * 2 : 150);
        this.radius = config.radius ?? Math.min(this.width, this.height) / 2;
        this.strength = config.strength ?? 0.5; // T (特斯拉)
    }
    
    /**
     * 获取指定位置的磁场强度（z分量）
     */
    getFieldAt(x, y) {
        return this.containsPoint(x, y) ? this.strength : 0;
    }
    
    /**
     * 判断点是否在对象内
     */
    containsPoint(x, y) {
        if (this.shape === 'circle') {
            const dx = x - this.x;
            const dy = y - this.y;
            return dx * dx + dy * dy <= this.radius * this.radius;
        }

        if (this.shape === 'triangle') {
            const ax = this.x + this.width / 2;
            const ay = this.y;
            const bx = this.x;
            const by = this.y + this.height;
            const cx = this.x + this.width;
            const cy = this.y + this.height;

            const v0x = cx - ax;
            const v0y = cy - ay;
            const v1x = bx - ax;
            const v1y = by - ay;
            const v2x = x - ax;
            const v2y = y - ay;

            const dot00 = v0x * v0x + v0y * v0y;
            const dot01 = v0x * v1x + v0y * v1y;
            const dot02 = v0x * v2x + v0y * v2y;
            const dot11 = v1x * v1x + v1y * v1y;
            const dot12 = v1x * v2x + v1y * v2y;

            const denom = dot00 * dot11 - dot01 * dot01;
            if (denom === 0) return false;
            const invDenom = 1 / denom;
            const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
            const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
            return u >= 0 && v >= 0 && (u + v) <= 1;
        }

        // rect (默认)
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            shape: this.shape,
            width: this.width,
            height: this.height,
            radius: this.radius,
            strength: this.strength
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.shape = data.shape || 'rect';
        this.width = data.width ?? this.width;
        this.height = data.height ?? this.height;
        this.radius = data.radius ?? Math.min(this.width, this.height) / 2;
        this.strength = data.strength ?? this.strength;
    }
}
