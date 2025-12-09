/**
 * 荧光屏：用于显示粒子命中点（侧视 + 正视）
 */

import { BaseObject } from './BaseObject.js';

export class FluorescentScreen extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.type = 'fluorescent-screen';

        // 正视区域参数
        this.width = config.width || 150;
        this.height = config.height || 150;
        // 侧视厚度（在左侧显示）
        this.depth = config.depth || 30;
        // 侧视与正视的间隔
        this.viewGap = config.viewGap ?? 12;
        // 光斑参数
        this.spotSize = config.spotSize || 6;
        this.persistence = config.persistence || 0.5; // 秒，默认短暂余辉

        // 命中记录（使用场景时间戳）
        this.hits = [];
    }

    /**
     * 记录粒子命中
     */
    recordHit(px, py, t) {
        // 将命中位置投影到前视中心线，保留竖直偏移
        const relY = py - this.y;
        if (Math.abs(relY) <= this.height / 2) {
            this.hits.push({ x: 0, y: relY, time: t });
        }
    }

    /**
     * 清理过期光斑
     */
    pruneHits(currentTime) {
        const cutoff = currentTime - this.persistence;
        this.hits = this.hits.filter(hit => hit.time >= cutoff);
    }

    containsPoint(x, y) {
        // 以正视区域中心为可选中区域
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.abs(dx) <= this.width / 2 && Math.abs(dy) <= this.height / 2;
    }

    serialize() {
        return {
            ...super.serialize(),
            width: this.width,
            height: this.height,
            depth: this.depth,
            viewGap: this.viewGap,
            spotSize: this.spotSize,
            persistence: this.persistence
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.width = data.width;
        this.height = data.height;
        this.depth = data.depth;
        this.viewGap = data.viewGap ?? 12;
        this.spotSize = data.spotSize;
        this.persistence = data.persistence ?? 0.5;
        this.hits = [];
    }
}
