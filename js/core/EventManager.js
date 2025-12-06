/**
 * 事件管理器 - 统一事件分发
 */

export class EventManager {
    constructor() {
        this.listeners = new Map();
    }
    
    /**
     * 注册事件监听
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    }
    
    /**
     * 移除事件监听
     */
    off(eventName, callback) {
        if (!this.listeners.has(eventName)) return;
        
        const callbacks = this.listeners.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    /**
     * 触发事件
     */
    emit(eventName, ...args) {
        if (!this.listeners.has(eventName)) return;
        
        const callbacks = this.listeners.get(eventName);
        for (const callback of callbacks) {
            callback(...args);
        }
    }
    
    /**
     * 清空所有监听
     */
    clear() {
        this.listeners.clear();
    }
}
