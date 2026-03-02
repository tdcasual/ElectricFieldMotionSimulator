/**
 * 矩形均匀电场
 */

import { ElectricField } from './ElectricField.js';
import {
    getWorldVertices,
    hasLocalVertices,
    normalizeObjectVerticesFromWorld,
    pointInPolygon
} from '../geometry/VertexGeometry.js';
import {
    buildRectPolygon,
    resolveGeometryContract
} from '../geometry/ObjectGeometryUtils.js';

function resolveRectVertices(source, fallbackVertices = null) {
    const geometry = resolveGeometryContract(
        source,
        {
            kind: 'polygon',
            vertices: fallbackVertices || buildRectPolygon(200, 150)
        },
        { allowCircle: false, allowPolygon: true }
    );
    if (geometry?.kind === 'polygon') {
        return geometry.vertices.map((point) => ({ ...point }));
    }
    return buildRectPolygon(200, 150);
}

export class RectElectricField extends ElectricField {
    static defaults() {
        return {
            type: 'electric-field-rect',
            x: 0,
            y: 0,
            geometry: {
                kind: 'polygon',
                vertices: buildRectPolygon(200, 150)
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
                    { key: 'width', sourceKey: 'width', label: '宽度', type: 'number', min: 1, step: 10 },
                    { key: 'height', sourceKey: 'height', label: '高度', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '场强 (N/C)', type: 'number', step: 100 },
                    { key: 'direction', label: '方向 (度)', type: 'number', min: 0, max: 360 }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'electric-field-rect';
        this.width = 200;
        this.height = 150;
        this.vertices = resolveRectVertices(config, buildRectPolygon(this.width, this.height));
        const worldVertices = getWorldVertices(this);
        normalizeObjectVerticesFromWorld(this, worldVertices);
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
        return false;
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            geometry: this.getGeometry()
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        const fallbackVertices = hasLocalVertices(this) ? this.vertices : buildRectPolygon(this.width, this.height);
        this.vertices = resolveRectVertices(data, fallbackVertices);
        const worldVertices = getWorldVertices(this);
        normalizeObjectVerticesFromWorld(this, worldVertices);
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
