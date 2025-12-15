/**
 * 垂直平行板电容器（板垂直于屏幕，用于左右偏转）
 * 仅以电场箭头示意，不绘制矩形区域。
 */

import { ElectricField } from './ElectricField.js';
import { Vector } from '../physics/VectorMath.js';
import { compileSafeMathExpression } from '../utils/SafeExpression.js';

export class VerticalParallelPlateCapacitor extends ElectricField {
    constructor(config = {}) {
        super(config);

        this.type = 'vertical-parallel-plate-capacitor';
        this.height = config.height || 200;             // 板高度（显示用）
        this.plateDistance = config.plateDistance || 80; // 板间距（沿屏幕法向）
        this.polarity = config.polarity || 1;
        this.sourceType = config.sourceType || 'dc';    // dc | ac | custom
        this.acAmplitude = config.acAmplitude ?? this.strength;
        this.acFrequency = config.acFrequency ?? 50;
        this.acPhase = config.acPhase ?? 0;
        this.dcBias = config.dcBias ?? 0;
        this.waveform = config.waveform || 'sine';
        this.customExpression = config.customExpression || 'Math.sin(2 * Math.PI * 50 * t)';
        this._customFn = null;
        this.compileCustomExpression();
    }

    getFieldAt(x, y, time = 0) {
        if (!this.containsPoint(x, y)) {
            return new Vector(0, 0, 0);
        }
        const strength = this.getEffectiveStrength(time);
        // 参考图示：电场箭头竖直，polarity 控制正反向（正=向上，负=向下）
        return new Vector(0, strength * this.polarity, 0);
    }

    containsPoint(x, y) {
        // 将板视作以 (x,y) 为中心的竖直条带，高度 height，厚度 plateDistance/2 前后
        const dx = x - this.x;
        const dy = y - this.y;
        if (Math.abs(dx) > this.plateDistance / 2) return false;
        if (Math.abs(dy) > this.height / 2) return false;
        return true;
    }

    serialize() {
        return {
            ...super.serialize(),
            height: this.height,
            plateDistance: this.plateDistance,
            polarity: this.polarity,
            color: this.color,
            sourceType: this.sourceType,
            acAmplitude: this.acAmplitude,
            acFrequency: this.acFrequency,
            acPhase: this.acPhase,
            dcBias: this.dcBias,
            waveform: this.waveform,
            customExpression: this.customExpression
        };
    }

    deserialize(data) {
        super.deserialize(data);
        this.height = data.height;
        this.plateDistance = data.plateDistance;
        this.strength = data.strength;
        this.direction = data.direction ?? 0; // unused for field direction, kept for compatibility
        this.polarity = data.polarity;
        this.color = data.color;
        this.sourceType = data.sourceType || 'dc';
        this.acAmplitude = data.acAmplitude ?? this.strength;
        this.acFrequency = data.acFrequency ?? 50;
        this.acPhase = data.acPhase ?? 0;
        this.dcBias = data.dcBias ?? 0;
        this.waveform = data.waveform || 'sine';
        this.customExpression = data.customExpression || 'Math.sin(2 * Math.PI * 50 * t)';
        this.compileCustomExpression();
    }

    getEffectiveStrength(time = 0) {
        if (this.sourceType !== 'ac') {
            if (this.sourceType === 'custom') {
                return this.dcBias + (this.acAmplitude ?? this.strength) * this.evaluateCustomWave(time);
            }
            return this.strength;
        }

        const omega = 2 * Math.PI * this.acFrequency;
        const phase = (this.acPhase * Math.PI) / 180;
        const t = time || 0;

        let wave = Math.sin(omega * t + phase);

        if (this.waveform === 'square') {
            wave = wave >= 0 ? 1 : -1;
        } else if (this.waveform === 'triangle') {
            const frac = (omega * t + phase) / (2 * Math.PI);
            const pos = frac - Math.floor(frac);
            wave = pos < 0.5 ? (pos * 4 - 1) : (3 - pos * 4);
        }

        return this.dcBias + this.acAmplitude * wave;
    }

    isTimeVarying() {
        return this.sourceType === 'ac' || this.sourceType === 'custom';
    }

    compileCustomExpression() {
        try {
            this._customFn = compileSafeMathExpression(this.customExpression);
        } catch (e) {
            console.warn('Invalid custom expression for vertical capacitor:', e);
            this._customFn = null;
        }
    }

    evaluateCustomWave(t) {
        if (!this._customFn) return 0;
        try {
            const v = this._customFn(t);
            return Number.isFinite(v) ? v : 0;
        } catch (e) {
            console.warn('Error evaluating custom expression:', e);
            return 0;
        }
    }
}
