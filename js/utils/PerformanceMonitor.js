/**
 * 性能监控器
 */

function percentile(values, ratio) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
    return sorted[index];
}

export class PerformanceMonitor {
    constructor() {
        this.frameTimes = [];
        this.maxSamples = 60;
        this.frameStartTime = 0;
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

    reset() {
        this.frameTimes = [];
        this.frameStartTime = 0;
    }

    getFrameStats() {
        if (this.frameTimes.length === 0) {
            return {
                avgMs: 0,
                p95Ms: 0,
                maxMs: 0,
                sampleCount: 0
            };
        }

        const total = this.frameTimes.reduce((sum, value) => sum + value, 0);
        return {
            avgMs: Number((total / this.frameTimes.length).toFixed(1)),
            p95Ms: Number(percentile(this.frameTimes, 0.95).toFixed(1)),
            maxMs: Number(Math.max(...this.frameTimes).toFixed(1)),
            sampleCount: this.frameTimes.length
        };
    }
    
    getFPS() {
        const stats = this.getFrameStats();
        if (stats.avgMs <= 0) return 0;
        return Math.round(1000 / stats.avgMs);
    }
    
}
