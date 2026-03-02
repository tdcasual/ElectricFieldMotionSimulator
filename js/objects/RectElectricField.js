/**
 * 矩形均匀电场
 */

import { ElectricField } from './ElectricField.js';
import {
    getWorldVertices,
    hasLocalVertices,
    normalizeLocalVertices,
    normalizeObjectVerticesFromWorld,
    pointInPolygon
} from '../geometry/VertexGeometry.js';

function buildRectPolygon(width, height) {
    const w = Number.isFinite(width) && width > 0 ? width : 1;
    const h = Number.isFinite(height) && height > 0 ? height : 1;
    return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
    ];
}

function extractGeometryVertices(source) {
    if (!source || typeof source !== 'object') return null;
    if (source.kind !== 'polygon') return null;
    return normalizeLocalVertices(source.vertices) || null;
}

function shouldUseGeometryInput(config) {
    if (!config || typeof config !== 'object') return false;
    const hasWidth = Object.prototype.hasOwnProperty.call(config, 'width');
    const hasHeight = Object.prototype.hasOwnProperty.call(config, 'height');
    const hasVertices = Object.prototype.hasOwnProperty.call(config, 'vertices');
    return !hasWidth && !hasHeight && !hasVertices;
}

export class RectElectricField extends ElectricField {
    static defaults() {
        const width = 200;
        const height = 150;
        return {
            type: 'electric-field-rect',
            x: 0,
            y: 0,
            width,
            height,
            geometry: {
                kind: 'polygon',
                vertices: buildRectPolygon(width, height)
            },
            strength: 1000,
            direction: 90
        };
    }

    static schema() {
        return [
            {
                title: '电场属性',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'width', label: '宽度', type: 'number', min: 1, step: 10 },
                    { key: 'height', label: '高度', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '场强 (N/C)', type: 'number', step: 100 },
                    { key: 'direction', label: '方向 (度)', type: 'number', min: 0, max: 360 }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'electric-field-rect';
        this.width = config.width || 200;
        this.height = config.height || 150;
        const fromGeometry = shouldUseGeometryInput(config)
            ? extractGeometryVertices(config.geometry)
            : null;
        this.vertices =
            fromGeometry ||
            normalizeLocalVertices(config.vertices) ||
            null;
        if (this.vertices) {
            const worldVertices = getWorldVertices(this);
            normalizeObjectVerticesFromWorld(this, worldVertices);
        }
    }
    
    /**
     * 获取指定位置的电场强度
     */
    getFieldAt(x, y) {
        if (!this.containsPoint(x, y)) {
            return { x: 0, y: 0 };
        }
        
        // 均匀电场
        const angleRad = this.direction * Math.PI / 180;
        return {
            x: this.strength * Math.cos(angleRad),
            y: this.strength * Math.sin(angleRad)
        };
    }
    
    /**
     * 判断点是否在对象内
     */
    containsPoint(x, y) {
        if (hasLocalVertices(this)) {
            return pointInPolygon(x, y, getWorldVertices(this));
        }
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            width: this.width,
            height: this.height,
            geometry: this.getGeometry(),
            vertices: hasLocalVertices(this) ? this.vertices.map((point) => ({ ...point })) : undefined
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.width = data.width;
        this.height = data.height;
        const fromGeometry = shouldUseGeometryInput(data)
            ? extractGeometryVertices(data.geometry)
            : null;
        this.vertices =
            fromGeometry ||
            normalizeLocalVertices(data.vertices) ||
            null;
        if (this.vertices) {
            const worldVertices = getWorldVertices(this);
            normalizeObjectVerticesFromWorld(this, worldVertices);
        }
    }

    getGeometry() {
        if (hasLocalVertices(this)) {
            return {
                kind: 'polygon',
                vertices: this.vertices.map((point) => ({ ...point }))
            };
        }
        return {
            kind: 'polygon',
            vertices: buildRectPolygon(this.width, this.height)
        };
    }
}
