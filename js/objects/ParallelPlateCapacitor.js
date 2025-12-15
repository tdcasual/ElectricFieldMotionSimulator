/**
 * 平行板电容器（屏幕平面内）
 */

import { ElectricField } from './ElectricField.js';
import { Vector } from '../physics/VectorMath.js';
import { compileSafeMathExpression } from '../utils/SafeExpression.js';

export class ParallelPlateCapacitor extends ElectricField {
    constructor(config = {}) {
        super(config);
        
        this.type = 'parallel-plate-capacitor';
        this.width = config.width || 200;                // 板长度（垂直于电场方向）
        this.plateDistance = config.plateDistance || 80; // 两板间距（沿电场方向）
        this.polarity = config.polarity || 1;            // 1 = 正向, -1 = 反向
        this.sourceType = config.sourceType || 'dc';     // dc | ac | custom
        this.acAmplitude = config.acAmplitude ?? this.strength;
        this.acFrequency = config.acFrequency ?? 50;     // Hz
        this.acPhase = config.acPhase ?? 0;              // deg
        this.dcBias = config.dcBias ?? 0;                // 直流偏置
        this.waveform = config.waveform || 'sine';       // sine|square|triangle
        this.customExpression = config.customExpression || 'Math.sin(2 * Math.PI * 50 * t)';
        this._customFn = null;
        this.compileCustomExpression();
    }
    
    getFieldAt(x, y, time = 0) {
        if (!this.containsPoint(x, y)) {
            return new Vector(0, 0, 0);
        }
        
        const angle = this.direction * Math.PI / 180;
        const strength = this.getEffectiveStrength(time);
        const Ex = strength * Math.cos(angle) * this.polarity;
        const Ey = strength * Math.sin(angle) * this.polarity;
        
        return new Vector(Ex, Ey, 0);
    }
    
    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        
        const plateAngle = (this.direction + 90) * Math.PI / 180;
        const cosPlate = Math.cos(plateAngle);
        const sinPlate = Math.sin(plateAngle);
        
        const fieldAngle = this.direction * Math.PI / 180;
        const cosField = Math.cos(fieldAngle);
        const sinField = Math.sin(fieldAngle);
        
        const alongPlate = dx * cosPlate + dy * sinPlate;  // 沿板方向
        const alongField = dx * cosField + dy * sinField;  // 沿电场方向
        
        if (Math.abs(alongPlate) > this.width / 2) return false;
        if (Math.abs(alongField) > this.plateDistance / 2) return false;
        
        return true;
    }
    
    serialize() {
        return {
            ...super.serialize(),
            width: this.width,
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
        this.width = data.width;
        this.plateDistance = data.plateDistance;
        this.strength = data.strength;
        this.direction = data.direction;
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
            console.warn('Invalid custom expression for capacitor:', e);
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
