/**
 * 磁场类
 */

import { BaseObject } from './BaseObject.js';

export class MagneticField extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.type = 'magnetic-field';
        this.width = config.width || 200;
        this.height = config.height || 150;
        this.strength = config.strength || 0.5; // T (特斯拉)
    }
    
    /**
     * 获取指定位置的磁场强度（z分量）
     */
    getFieldAt(x, y) {
        // 检查点是否在磁场区域内
        if (x < this.x || x > this.x + this.width ||
            y < this.y || y > this.y + this.height) {
            return 0;
        }
        
        return this.strength;
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
            height: this.height,
            strength: this.strength
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.width = data.width;
        this.height = data.height;
        this.strength = data.strength;
    }
}
