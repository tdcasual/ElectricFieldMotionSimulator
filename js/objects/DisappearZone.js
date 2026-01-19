/**
 * 消失区域：一条“吸收线”，粒子碰到后会消失
 */

import { BaseObject } from './BaseObject.js';

export class DisappearZone extends BaseObject {
    constructor(config = {}) {
        super(config);
        this.type = 'disappear-zone';

        this.length = config.length ?? 320;
        this.angle = config.angle ?? 0; // 度
        this.lineWidth = config.lineWidth ?? 6; // px（显示+碰撞厚度）
    }

    getEndpoints() {
        const half = this.length / 2;
        const rad = (this.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * half;
        const dy = Math.sin(rad) * half;
        return {
            x1: this.x - dx,
            y1: this.y - dy,
            x2: this.x + dx,
            y2: this.y + dy
        };
    }

    distancePointToSegment(px, py, ax, ay, bx, by) {
        const abx = bx - ax;
        const aby = by - ay;
        const apx = px - ax;
        const apy = py - ay;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) return Math.hypot(apx, apy);
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));
        const cx = ax + abx * t;
        const cy = ay + aby * t;
        return Math.hypot(px - cx, py - cy);
    }

    containsPoint(x, y) {
        const { x1, y1, x2, y2 } = this.getEndpoints();
        const tolerance = (this.lineWidth ?? 6) / 2 + 6;
        return this.distancePointToSegment(x, y, x1, y1, x2, y2) <= tolerance;
    }

    serialize() {
        return {
            ...super.serialize(),
            length: this.length,
            angle: this.angle,
            lineWidth: this.lineWidth
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.length = data.length ?? this.length;
        this.angle = data.angle ?? this.angle;
        this.lineWidth = data.lineWidth ?? this.lineWidth;
    }
}

