/**
 * 磁场类
 */

import { BaseObject } from './BaseObject.js';
import {
    hasLocalVertices,
    normalizeLocalVertices
} from '../geometry/VertexGeometry.js';
import { geometryContainsPoint } from '../geometry/GeometryKernel.js';

function isFinitePositive(value) {
    return Number.isFinite(value) && value > 0;
}

function buildRectPolygon(width, height) {
    const w = isFinitePositive(width) ? width : 1;
    const h = isFinitePositive(height) ? height : 1;
    return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
    ];
}

function buildTrianglePolygon(width, height) {
    const w = isFinitePositive(width) ? width : 1;
    const h = isFinitePositive(height) ? height : 1;
    return [
        { x: w / 2, y: 0 },
        { x: 0, y: h },
        { x: w, y: h }
    ];
}

function cloneVertices(vertices) {
    return vertices.map((point) => ({ x: point.x, y: point.y }));
}

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

function normalizeGeometryContract(source) {
    if (!source || typeof source !== 'object') return null;
    if (source.kind === 'circle') {
        const radius = Number(source.radius);
        if (!isFinitePositive(radius)) return null;
        return { kind: 'circle', radius };
    }
    if (source.kind === 'polygon') {
        const vertices = normalizeLocalVertices(source.vertices);
        if (!vertices) return null;
        return { kind: 'polygon', vertices: cloneVertices(vertices) };
    }
    return null;
}

function resolveMagneticGeometry(config = {}, typeHint = 'magnetic-field') {
    const fromGeometry = normalizeGeometryContract(config.geometry);
    if (fromGeometry) return fromGeometry;

    const fromVertices = normalizeLocalVertices(config.vertices);
    if (fromVertices) {
        return { kind: 'polygon', vertices: cloneVertices(fromVertices) };
    }

    const type = String(config.type || typeHint || 'magnetic-field');
    const width = Number(config.width);
    const height = Number(config.height);
    const radius = Number(config.radius);

    if (type === 'magnetic-field-circle') {
        const circleRadius = isFinitePositive(radius) ? radius : 90;
        return { kind: 'circle', radius: circleRadius };
    }

    if (type === 'magnetic-field-triangle') {
        const triangleWidth = isFinitePositive(width) ? width : 240;
        const triangleHeight = isFinitePositive(height) ? height : 180;
        return {
            kind: 'polygon',
            vertices: buildTrianglePolygon(triangleWidth, triangleHeight)
        };
    }

    if (isFinitePositive(radius) && !isFinitePositive(width) && !isFinitePositive(height)) {
        return { kind: 'circle', radius };
    }

    const rectWidth = isFinitePositive(width) ? width : 200;
    const rectHeight = isFinitePositive(height) ? height : 150;
    return {
        kind: 'polygon',
        vertices: buildRectPolygon(rectWidth, rectHeight)
    };
}

export class MagneticField extends BaseObject {
    static defaults() {
        const width = 200;
        const height = 150;
        return {
            type: 'magnetic-field',
            x: 0,
            y: 0,
            width,
            height,
            radius: 90,
            geometry: {
                kind: 'polygon',
                vertices: buildRectPolygon(width, height)
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
                    { key: 'width', label: '宽度', type: 'number', min: 1, step: 10 },
                    { key: 'height', label: '高度', type: 'number', min: 1, step: 10 },
                    { key: 'radius', label: '半径', type: 'number', min: 1, step: 10 },
                    { key: 'strength', label: '磁感应强度 (T)', type: 'number', step: 0.1 }
                ]
            }
        ];
    }

    constructor(config = {}) {
        super(config);
        this.type = config.type || 'magnetic-field';
        this.width = 200;
        this.height = 150;
        this.radius = 75;
        this.vertices = null;
        this.applyGeometry(config);
        this.strength = config.strength ?? 0.5; // T (特斯拉)
    }

    applyGeometry(source = {}) {
        const geometry = resolveMagneticGeometry(source, this.type);
        if (geometry.kind === 'circle') {
            this.vertices = null;
            this.radius = geometry.radius;
            this.width = geometry.radius * 2;
            this.height = geometry.radius * 2;
            return;
        }

        const vertices = normalizeLocalVertices(geometry.vertices) || buildRectPolygon(this.width, this.height);
        const bounds = computeLocalBounds(vertices);
        if (!bounds) {
            this.vertices = buildRectPolygon(this.width, this.height);
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
            width: this.width,
            height: this.height,
            radius: this.radius,
            geometry: this.getGeometry(),
            vertices: hasLocalVertices(this) ? this.vertices.map((point) => ({ ...point })) : undefined,
            strength: this.strength
        };
    }
    
    /**
     * 反序列化
     */
    deserialize(data) {
        super.deserialize(data);
        this.type = data.type || this.type;
        this.applyGeometry(data || {});
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
