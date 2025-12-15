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
    containsPoint(x, y) {
        // 子类实现
        return false;
    }
    
    /**
     * 更新对象状态
     */
    update(dt) {
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
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
    }
}
