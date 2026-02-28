/**
 * 性能监控器
 */

export class PerformanceMonitor {
    constructor() {
        this.frameTimes = [];
        this.maxSamples = 60;
    }
    
    startFrame() {
        this.frameStartTime = performance.now();
    }
    
    endFrame() {
        const now = performance.now();
        const frameTime = now - this.frameStartTime;
        
        this.frameTimes.push(frameTime);
        if (this.frameTimes.length > this.maxSamples) {
            this.frameTimes.shift();
        }
    }
    
    getFPS() {
        if (this.frameTimes.length === 0) return 0;
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b) / this.frameTimes.length;
        return Math.round(1000 / avgFrameTime);
    }
    
}
