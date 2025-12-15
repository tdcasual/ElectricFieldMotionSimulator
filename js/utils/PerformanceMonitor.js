/**
 * 性能监控器
 */

export class PerformanceMonitor {
    constructor() {
        this.frameTimes = [];
        this.maxSamples = 60;
        this.lastFrameTime = performance.now();
        this.metrics = {};
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
    
    startMeasure(label) {
        if (!this.metrics[label]) {
            this.metrics[label] = { times: [], start: 0 };
        }
        this.metrics[label].start = performance.now();
    }
    
    endMeasure(label) {
        if (!this.metrics[label]) return;
        const duration = performance.now() - this.metrics[label].start;
        this.metrics[label].times.push(duration);
        
        if (this.metrics[label].times.length > 100) {
            this.metrics[label].times.shift();
        }
    }
    
    getAverageTime(label) {
        if (!this.metrics[label] || this.metrics[label].times.length === 0) return 0;
        const times = this.metrics[label].times;
        return times.reduce((a, b) => a + b) / times.length;
    }
}
