/**
 * 对象基类
 */

export class BaseObject {
    constructor(config = {}) {
        this.id = this.generateId();
        this.type = config.type || 'base';
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.scene = null;
    }
    
    /**
     * 生成唯一ID
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 判断点是否在对象内
     */
    containsPoint() {
        // 子类实现
        return false;
    }
    
    /**
     * 更新对象状态
     */
    update() {
        // 子类实现
    }
    
    /**
     * 序列化对象
     */
    serialize() {
        return {
            type: this.type,
            id: this.id,
            x: this.x,
            y: this.y
        };
    }
    
    /**
     * 从数据反序列化
     */
    deserialize(data) {
        if (data && typeof data.id === 'string' && data.id.length) {
            this.id = data.id;
        }
        if (data && typeof data.x === 'number') {
            this.x = data.x;
        }
        if (data && typeof data.y === 'number') {
            this.y = data.y;
        }
    }
}
