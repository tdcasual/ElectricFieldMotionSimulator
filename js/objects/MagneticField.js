/**
 * 磁场类
 */

import { BaseObject } from './BaseObject.js';
import {
    hasLocalVertices,
    normalizeLocalVertices
} from '../geometry/VertexGeometry.js';
import { geometryContainsPoint } from '../geometry/GeometryKernel.js';
import {
    buildRectPolygon,
    resolveGeometryContract
} from '../geometry/ObjectGeometryUtils.js';

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const DEFAULT_POLYGON = Object.freeze(buildRectPolygon(DEFAULT_WIDTH, DEFAULT_HEIGHT));

function computeLocalBounds(vertices) {
    const normalized = normalizeLocalVertices(vertices);
    if (!normalized) return null;
    let minX = normalized[0].x;
    let maxX = normalized[0].x;
    let minY = normalized[0].y;
    let maxY = normalized[0].y;
    for (let i = 1; i < normalized.length; i += 1) {
        const point = normalized[i];
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, maxX, minY, maxY };
}

function resolveMagneticGeometry(config = {}, fallbackGeometry = null) {
    return resolveGeometryContract(config, fallbackGeometry);
}

export class MagneticField extends BaseObject {
    static defaults() {
        return {
            type: 'magnetic-field',
            x: 0,
            y: 0,
            geometry: {
                kind: 'polygon',
                vertices: DEFAULT_POLYGON.map((point) => ({ ...point }))
            },
            strength: 0.5
        };
    }

    static schema() {
        return [
            {
                title: '磁场属性',
                fields: [
                    { key: 'x', label: 'X 坐标', type: 'number', step: 10 },
                    { key: 'y', label: 'Y 坐标', type: 'number', step: 10 },
                    { key: 'width', sourceKey: 'width', label: '宽度', type: 'number', min: 1, step: 10 },
                    { key: 'height', sourceKey: 'height', label: '高度', type: 'number', min: 1, step: 10 },
                    { key: 'radius', sourceKey: 'radius', label: '半径', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '磁感应强度 (T)', type: 'number', step: 0.1 }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = 'magnetic-field';
        this.width = DEFAULT_WIDTH;
        this.height = DEFAULT_HEIGHT;
        this.radius = DEFAULT_HEIGHT / 2;
        this.vertices = null;
        this.applyGeometry(config, {
            kind: 'polygon',
            vertices: DEFAULT_POLYGON.map((point) => ({ ...point }))
        });
        this.strength = config.strength ?? 0.5; // T (特斯拉)
    }

    applyGeometry(source = {}, fallbackGeometry = null) {
        const geometry = resolveMagneticGeometry(source, fallbackGeometry);
        if (!geometry) return;
        if (geometry.kind === 'circle') {
            this.vertices = null;
            this.radius = geometry.radius;
            this.width = geometry.radius * 2;
            this.height = geometry.radius * 2;
            return;
        }

        const vertices = normalizeLocalVertices(geometry.vertices) || DEFAULT_POLYGON.map((point) => ({ ...point }));
        const bounds = computeLocalBounds(vertices);
        if (!bounds) {
            this.vertices = DEFAULT_POLYGON.map((point) => ({ ...point }));
            this.width = DEFAULT_WIDTH;
            this.height = DEFAULT_HEIGHT;
            this.radius = DEFAULT_HEIGHT / 2;
            return;
        }

        const baseX = Number.isFinite(this.x) ? this.x : 0;
        const baseY = Number.isFinite(this.y) ? this.y : 0;
        this.x = baseX + bounds.minX;
        this.y = baseY + bounds.minY;
        this.vertices = vertices.map((point) => ({
            x: point.x - bounds.minX,
            y: point.y - bounds.minY
        }));
        this.width = Math.max(1, bounds.maxX - bounds.minX);
        this.height = Math.max(1, bounds.maxY - bounds.minY);
        this.radius = Math.min(this.width, this.height) / 2;
    }
    
    /**
     * 获取指定位置的磁场强度（z分量）
     */
    getFieldAt(x, y) {
        return this.containsPoint(x, y) ? this.strength : 0;
    }
    
    /**
     * 判断点是否在对象内
     */
    containsPoint(x, y) {
        return geometryContainsPoint(this, x, y);
    }
    
    /**
     * 序列化
     */
    serialize() {
        return {
            ...super.serialize(),
            geometry: this.getGeometry(),
            strength: this.strength
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.type = 'magnetic-field';
        this.applyGeometry(data || {}, this.getGeometry());
        this.strength = data.strength ?? this.strength;
    }

    getGeometry() {
        if (!hasLocalVertices(this)) {
            return {
                kind: 'circle',
                radius: this.radius
            };
        }

        return {
            kind: 'polygon',
            vertices: this.vertices.map((point) => ({ ...point }))
        };
    }
}
