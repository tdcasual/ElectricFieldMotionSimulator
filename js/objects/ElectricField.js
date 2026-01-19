/**
 * 电场基类
 */

import { BaseObject } from './BaseObject.js';

export class ElectricField extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.strength = config.strength ?? 1000; // N/C
        this.direction = config.direction ?? 90; // 度（0=右，90=下）
    }
    
    /**
     * 获取指定位置的电场强度
     * @returns {Object} {x: Ex, y: Ey}
     */
    getFieldAt(x, y, time = 0) {
        // 子类实现
        return { x: 0, y: 0 };
    }

    isTimeVarying() {
        return false;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            strength: this.strength,
            direction: this.direction
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.strength = data.strength;
        this.direction = data.direction;
    }
}
