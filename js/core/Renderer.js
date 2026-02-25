/**
 * 渲染引擎 - 管理多层Canvas渲染
 */

import { GridRenderer } from '../rendering/GridRenderer.js';
import { FieldVisualizer } from '../rendering/FieldVisualizer.js';
import { TrajectoryRenderer } from '../rendering/TrajectoryRenderer.js';
import { computeResponsiveParticleMetrics } from '../rendering/ResponsiveSizing.js';
import { ForceCalculator } from '../physics/ForceCalculator.js';
import { registry } from './registerObjects.js';
import { getObjectRenderer } from '../rendering/ObjectRenderers.js';

export class Renderer {
    constructor() {
        this.bgCanvas = null;
        this.fieldCanvas = null;
        this.particleCanvas = null;

        this.bgCtx = null;
        this.fieldCtx = null;
        this.particleCtx = null;

        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;

        this.gridRenderer = new GridRenderer();
        this.fieldVisualizer = new FieldVisualizer();
        this.trajectoryRenderer = new TrajectoryRenderer();
        this.forceCalculator = new ForceCalculator();
        this.particleRenderRadius = 6;
        this.particleSelectionPadding = 10;
        this.updateResponsiveParticleMetrics(
            typeof window !== 'undefined' ? window.innerWidth : 1280,
            typeof window !== 'undefined' ? window.innerHeight : 720
        );

        this.needFieldRedraw = true;
    }

    getCameraOffset(scene) {
        const offsetX = Number.isFinite(scene?.camera?.offsetX) ? scene.camera.offsetX : 0;
        const offsetY = Number.isFinite(scene?.camera?.offsetY) ? scene.camera.offsetY : 0;
        return { offsetX, offsetY };
    }

    updateResponsiveParticleMetrics(viewportWidth, viewportHeight) {
        const metrics = computeResponsiveParticleMetrics(viewportWidth, viewportHeight);
        this.particleRenderRadius = metrics.particleRenderRadius;
        this.particleSelectionPadding = metrics.particleSelectionPadding;
    }

    init() {
        // 获取Canvas元素
        this.bgCanvas = document.getElementById('bg-canvas');
        this.fieldCanvas = document.getElementById('field-canvas');
        this.particleCanvas = document.getElementById('particle-canvas');

        if (!this.bgCanvas || !this.fieldCanvas || !this.particleCanvas) {
            console.warn('Renderer: canvas elements not found, init skipped.');
            return;
        }

        this.bgCtx = this.bgCanvas.getContext('2d');
        this.fieldCtx = this.fieldCanvas.getContext('2d');
        this.particleCtx = this.particleCanvas.getContext('2d');

        // 设置尺寸
        this.resize();

        // 开启抗锯齿
        this.bgCtx.imageSmoothingEnabled = true;
        this.fieldCtx.imageSmoothingEnabled = true;
        this.particleCtx.imageSmoothingEnabled = true;
    }

    resize() {
        const container = document.getElementById('canvas-container');
        if (!container || !this.bgCanvas || !this.fieldCanvas || !this.particleCanvas) {
            return;
        }
        this.dpr = window.devicePixelRatio || 1;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.updateResponsiveParticleMetrics(this.width, this.height);

        // 设置Canvas尺寸（考虑DPI）
        [this.bgCanvas, this.fieldCanvas, this.particleCanvas].forEach(canvas => {
            canvas.width = this.width * this.dpr;
            canvas.height = this.height * this.dpr;
            canvas.style.width = this.width + 'px';
            canvas.style.height = this.height + 'px';

            const ctx = canvas.getContext('2d');
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            ctx.imageSmoothingEnabled = true;
        });

        this.needFieldRedraw = true;
    }

    render(scene) {
        if (!this.bgCtx || !this.fieldCtx || !this.particleCtx) return;

        // 渲染背景层（仅在需要时）
        if (this.needFieldRedraw || scene.hasTimeVaryingFields()) {
            this.renderBackground(scene);
            this.renderFields(scene);
            this.needFieldRedraw = false;
        }

        // 渲染粒子层（每帧）
        this.renderParticles(scene);
    }

    renderBackground(scene) {
        this.bgCtx.clearRect(0, 0, this.width, this.height);
        const { offsetX, offsetY } = this.getCameraOffset(scene);

        // 绘制网格
        if (scene.settings.showGrid) {
            this.gridRenderer.render(this.bgCtx, this.width, this.height, scene.settings.gridSize, offsetX, offsetY);
        }
    }

    renderFields(scene) {
        this.fieldCtx.clearRect(0, 0, this.width, this.height);
        const { offsetX, offsetY } = this.getCameraOffset(scene);

        const objects = scene.objects || scene.getAllObjects();
        const renderOrder = ['electric', 'magnetic', 'device'];
        this.fieldCtx.save();
        this.fieldCtx.translate(offsetX, offsetY);
        for (const key of renderOrder) {
            const renderer = getObjectRenderer(key);
            if (!renderer) continue;
            for (const object of objects) {
                const entry = registry.get(object?.type);
                if (!entry || entry.rendererKey !== key) continue;
                renderer(this, object, scene);
            }
        }
        this.drawTangencyHint(scene);
        this.fieldCtx.restore();

        // 绘制场强矢量（可选）
        if (scene.settings.showFieldVectors) {
            this.fieldVisualizer.render(this.fieldCtx, scene, this.width, this.height, { offsetX, offsetY });
        }
    }

    drawTangencyHint(scene) {
        const hint = scene?.interaction?.tangencyHint;
        if (!hint) return;
        const circle = hint.activeCircle;
        const hasCircle = !!circle &&
            Number.isFinite(circle.x) &&
            Number.isFinite(circle.y) &&
            Number.isFinite(circle.radius) &&
            circle.radius > 0;

        const point = hint.activePoint;
        const hasPoint = !!point &&
            Number.isFinite(point.x) &&
            Number.isFinite(point.y);

        if (!hasCircle && !hasPoint) {
            return;
        }

        this.fieldCtx.save();
        if (hasCircle) {
            this.fieldCtx.strokeStyle = 'rgba(0, 220, 210, 0.95)';
            this.fieldCtx.lineWidth = 2;
            this.fieldCtx.setLineDash([6, 4]);
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(circle.x, circle.y, circle.radius + 4, 0, Math.PI * 2);
            this.fieldCtx.stroke();
            this.fieldCtx.setLineDash([]);
        } else if (hasPoint) {
            this.fieldCtx.strokeStyle = 'rgba(0, 220, 210, 0.95)';
            this.fieldCtx.lineWidth = 2;
            this.fieldCtx.setLineDash([4, 3]);
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            this.fieldCtx.stroke();
            this.fieldCtx.setLineDash([]);

            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(point.x - 5, point.y);
            this.fieldCtx.lineTo(point.x + 5, point.y);
            this.fieldCtx.moveTo(point.x, point.y - 5);
            this.fieldCtx.lineTo(point.x, point.y + 5);
            this.fieldCtx.stroke();
        }

        const candidate = hint.candidate;
        if (candidate?.kind === 'circle' &&
            Number.isFinite(candidate.x) &&
            Number.isFinite(candidate.y) &&
            Number.isFinite(candidate.radius) &&
            candidate.radius > 0) {
            this.fieldCtx.strokeStyle = 'rgba(0, 180, 255, 0.92)';
            this.fieldCtx.lineWidth = 2.5;
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(candidate.x, candidate.y, candidate.radius, 0, Math.PI * 2);
            this.fieldCtx.stroke();
        } else if (candidate?.kind === 'segment' &&
            Number.isFinite(candidate.x1) &&
            Number.isFinite(candidate.y1) &&
            Number.isFinite(candidate.x2) &&
            Number.isFinite(candidate.y2)) {
            this.fieldCtx.strokeStyle = 'rgba(0, 180, 255, 0.92)';
            this.fieldCtx.lineWidth = 3;
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(candidate.x1, candidate.y1);
            this.fieldCtx.lineTo(candidate.x2, candidate.y2);
            this.fieldCtx.stroke();
        } else if (candidate?.kind === 'point' &&
            Number.isFinite(candidate.x) &&
            Number.isFinite(candidate.y)) {
            this.fieldCtx.fillStyle = 'rgba(0, 180, 255, 0.95)';
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(candidate.x, candidate.y, 5, 0, Math.PI * 2);
            this.fieldCtx.fill();
        }

        const relationText = hint.relation === 'inner' ? '内切' : '外切';
        const baseLabel = hint.kind === 'circle-circle'
            ? `相切（${relationText}）`
            : (hint.kind === 'point-circle' || hint.kind === 'point-segment' || hint.kind === 'circle-point'
                ? '边界贴合'
                : '相切');
        const label = hint.suppressed ? `${baseLabel} Alt仅提示` : baseLabel;
        const labelX = hasCircle ? (circle.x + circle.radius + 10) : (point.x + 12);
        const labelY = hasCircle ? (circle.y - circle.radius - 8) : (point.y - 10);
        this.drawTextBadge(
            this.fieldCtx,
            labelX,
            labelY,
            label
        );
        this.fieldCtx.restore();
    }

    drawElectricField(field, scene) {
        this.fieldCtx.save();

        // 绘制场边界
        this.fieldCtx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        this.fieldCtx.lineWidth = 2;

        if (field.type === 'electric-field-rect') {
            this.fieldCtx.strokeRect(field.x, field.y, field.width, field.height);

            // 填充半透明背景
            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fillRect(field.x, field.y, field.width, field.height);
        } else if (field.type === 'electric-field-circle') {
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
            this.fieldCtx.stroke();

            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fill();
        } else if (field.type === 'semicircle-electric-field') {
            // 半圆电场 - 绘制半圆
            const angle = field.orientation * Math.PI / 180;
            const startAngle = angle - Math.PI / 2;
            const endAngle = angle + Math.PI / 2;

            this.fieldCtx.beginPath();
            this.fieldCtx.arc(field.x, field.y, field.radius, startAngle, endAngle);
            this.fieldCtx.lineTo(field.x, field.y);
            this.fieldCtx.closePath();
            this.fieldCtx.stroke();

            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fill();
        } else if (field.type === 'parallel-plate-capacitor') {
            // 平行板电容器 - 绘制两条平行的板
            // 极板方向（垂直于电场方向）
            const plateAngle = (field.direction + 90) * Math.PI / 180;
            const cosPlate = Math.cos(plateAngle);
            const sinPlate = Math.sin(plateAngle);

            // 电场方向
            const fieldAngle = field.direction * Math.PI / 180;
            const cosField = Math.cos(fieldAngle);
            const sinField = Math.sin(fieldAngle);

            const halfWidth = field.width / 2;
            const halfDist = field.plateDistance / 2;

            // 第一块板（沿负电场方向）
            const plate1X1 = field.x - cosPlate * halfWidth - cosField * halfDist;
            const plate1Y1 = field.y - sinPlate * halfWidth - sinField * halfDist;
            const plate1X2 = field.x + cosPlate * halfWidth - cosField * halfDist;
            const plate1Y2 = field.y + sinPlate * halfWidth - sinField * halfDist;

            // 第二块板（沿正电场方向）
            const plate2X1 = field.x - cosPlate * halfWidth + cosField * halfDist;
            const plate2Y1 = field.y - sinPlate * halfWidth + sinField * halfDist;
            const plate2X2 = field.x + cosPlate * halfWidth + cosField * halfDist;
            const plate2Y2 = field.y + sinPlate * halfWidth + sinField * halfDist;

            // 绘制两块板
            this.fieldCtx.strokeStyle = field.polarity > 0 ? '#0088ff' : '#ff4444';
            this.fieldCtx.lineWidth = 3;

            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate1X2, plate1Y2);
            this.fieldCtx.stroke();

            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate2X1, plate2Y1);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.stroke();

            // 绘制连接线（淡色虚线）
            this.fieldCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
            this.fieldCtx.lineWidth = 1;
            this.fieldCtx.setLineDash([5, 5]);

            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate2X1, plate2Y1);
            this.fieldCtx.stroke();

            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X2, plate1Y2);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.stroke();

            this.fieldCtx.setLineDash([]);

            // 填充区域（两板之间）
            this.fieldCtx.fillStyle = 'rgba(100, 150, 255, 0.1)';
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate1X2, plate1Y2);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.lineTo(plate2X1, plate2Y1);
            this.fieldCtx.closePath();
            this.fieldCtx.fill();
        } else if (field.type === 'vertical-parallel-plate-capacitor') {
            // 垂直平行板电容器：用两条竖线和箭头示意
            const halfHeight = field.height / 2;
            const halfGap = field.plateDistance / 2;
            const xLeft = field.x - halfGap;
            const xRight = field.x + halfGap;
            const yTop = field.y - halfHeight;
            const yBottom = field.y + halfHeight;

            this.fieldCtx.strokeStyle = field.polarity > 0 ? '#0088ff' : '#ff4444';
            this.fieldCtx.lineWidth = 3;

            // 左板
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(xLeft, yTop);
            this.fieldCtx.lineTo(xLeft, yBottom);
            this.fieldCtx.stroke();
            // 右板
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(xRight, yTop);
            this.fieldCtx.lineTo(xRight, yBottom);
            this.fieldCtx.stroke();

            // 箭头示意电场方向（竖直）
            const dir = field.polarity >= 0 ? -1 : 1; // 正向向上
            const arrowX = field.x;
            const arrowTop = field.y + dir * (halfHeight * 0.6);
            const arrowBottom = field.y - dir * (halfHeight * 0.1);
            const dy = arrowBottom - arrowTop;

            this.fieldCtx.strokeStyle = '#00ccaa';
            this.fieldCtx.fillStyle = '#00ccaa';
            this.fieldCtx.lineWidth = 2;
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(arrowX, arrowTop);
            this.fieldCtx.lineTo(arrowX, arrowBottom);
            this.fieldCtx.stroke();

            const angle = dir < 0 ? -Math.PI / 2 : Math.PI / 2;
            const headLen = 8;
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(arrowX, arrowTop);
            this.fieldCtx.lineTo(arrowX - headLen * Math.cos(angle - Math.PI / 6), arrowTop - headLen * Math.sin(angle - Math.PI / 6));
            this.fieldCtx.lineTo(arrowX - headLen * Math.cos(angle + Math.PI / 6), arrowTop - headLen * Math.sin(angle + Math.PI / 6));
            this.fieldCtx.closePath();
            this.fieldCtx.fill();
        }

        // 显示场强（便于查看）
        if (field.type === 'electric-field-rect' ||
            field.type === 'electric-field-circle' ||
            field.type === 'semicircle-electric-field') {
            const strength = Number.isFinite(field.strength) ? field.strength : 0;
            let labelX = field.x + 8;
            let labelY = field.y + 18;
            if (field.type === 'electric-field-circle' || field.type === 'semicircle-electric-field') {
                const r = Number.isFinite(field.radius) ? field.radius : 0;
                labelX = field.x - r + 8;
                labelY = field.y - r + 18;
            }
            this.drawTextBadge(this.fieldCtx, labelX, labelY, `E: ${this.formatNumber(strength)} N/C`);
        }

        // 绘制选中高亮
        if (field === scene.selectedObject) {
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 3;
            this.fieldCtx.setLineDash([5, 5]);

            if (field.type === 'electric-field-rect') {
                this.fieldCtx.strokeRect(field.x - 5, field.y - 5, field.width + 10, field.height + 10);
            } else if (field.type === 'electric-field-circle') {
                this.fieldCtx.beginPath();
                this.fieldCtx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
                this.fieldCtx.stroke();
            } else if (field.type === 'semicircle-electric-field') {
                this.fieldCtx.beginPath();
                this.fieldCtx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
                this.fieldCtx.stroke();
            } else if (field.type === 'parallel-plate-capacitor') {
                // 绘制电容器的选中边界
                const plateAngle = (field.direction + 90) * Math.PI / 180;
                const cosPlate = Math.cos(plateAngle);
                const sinPlate = Math.sin(plateAngle);

                const fieldAngle = field.direction * Math.PI / 180;
                const cosField = Math.cos(fieldAngle);
                const sinField = Math.sin(fieldAngle);

                const halfWidth = field.width / 2 + 5;
                const halfDist = field.plateDistance / 2 + 5;

                this.fieldCtx.beginPath();
                this.fieldCtx.moveTo(
                    field.x - cosPlate * halfWidth - cosField * halfDist,
                    field.y - sinPlate * halfWidth - sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x + cosPlate * halfWidth - cosField * halfDist,
                    field.y + sinPlate * halfWidth - sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x + cosPlate * halfWidth + cosField * halfDist,
                    field.y + sinPlate * halfWidth + sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x - cosPlate * halfWidth + cosField * halfDist,
                    field.y - sinPlate * halfWidth + sinField * halfDist
                );
                this.fieldCtx.closePath();
                this.fieldCtx.stroke();
            } else if (field.type === 'vertical-parallel-plate-capacitor') {
                const halfHeight = field.height / 2 + 5;
                const halfGap = field.plateDistance / 2 + 5;
                this.fieldCtx.strokeRect(field.x - halfGap, field.y - halfHeight, halfGap * 2, halfHeight * 2);
            }

            this.fieldCtx.setLineDash([]);

            // 缩放控制点（仅匀强电场）
            if (field.type === 'electric-field-rect' ||
                field.type === 'electric-field-circle' ||
                field.type === 'semicircle-electric-field') {
                const handles = [];
                if (field.type === 'electric-field-rect') {
                    handles.push({ x: field.x, y: field.y });
                    handles.push({ x: field.x + field.width, y: field.y });
                    handles.push({ x: field.x, y: field.y + field.height });
                    handles.push({ x: field.x + field.width, y: field.y + field.height });
                } else {
                    const r = Math.max(0, field.radius ?? 0);
                    handles.push({ x: field.x + r, y: field.y });
                }

                const size = 10;
                this.fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                this.fieldCtx.strokeStyle = '#0e639c';
                this.fieldCtx.lineWidth = 2;
                for (const handle of handles) {
                    this.fieldCtx.beginPath();
                    this.fieldCtx.rect(handle.x - size / 2, handle.y - size / 2, size, size);
                    this.fieldCtx.fill();
                    this.fieldCtx.stroke();
                }
            }
        }

        this.fieldCtx.restore();
    }

    drawMagneticField(field, scene) {
        this.fieldCtx.save();

        const strength = Number.isFinite(field.strength) ? field.strength : 0;
        const hasDirection = Math.abs(strength) > 1e-12;
        const shape = field.shape || 'rect';
        const colorRgb = strength >= 0 ? [100, 150, 255] : [255, 100, 100];
        const borderColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.65)`;
        const fillColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.08)`;
        const symbolColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.85)`;

        const beginShapePath = () => {
            this.fieldCtx.beginPath();
            if (shape === 'circle') {
                const r = Math.max(0, field.radius ?? 0);
                this.fieldCtx.arc(field.x, field.y, r, 0, Math.PI * 2);
                return {
                    minX: field.x - r,
                    minY: field.y - r,
                    maxX: field.x + r,
                    maxY: field.y + r
                };
            }

            if (shape === 'triangle') {
                const x = field.x;
                const y = field.y;
                const w = field.width ?? 0;
                const h = field.height ?? 0;
                this.fieldCtx.moveTo(x + w / 2, y);
                this.fieldCtx.lineTo(x, y + h);
                this.fieldCtx.lineTo(x + w, y + h);
                this.fieldCtx.closePath();
                return { minX: x, minY: y, maxX: x + w, maxY: y + h };
            }

            // rect (默认)
            const x = field.x;
            const y = field.y;
            const w = field.width ?? 0;
            const h = field.height ?? 0;
            this.fieldCtx.rect(x, y, w, h);
            return { minX: x, minY: y, maxX: x + w, maxY: y + h };
        };

        // 绘制磁场边界与填充
        const bounds = beginShapePath();
        this.fieldCtx.strokeStyle = borderColor;
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.stroke();
        this.fieldCtx.fillStyle = fillColor;
        this.fieldCtx.fill();

        // 圆形/矩形磁场绘制几何中心标记，便于对齐
        const center = (() => {
            if (shape === 'circle') {
                if (!Number.isFinite(field.x) || !Number.isFinite(field.y)) return null;
                return { x: field.x, y: field.y };
            }
            if (shape === 'rect') {
                if (
                    !Number.isFinite(field.x) ||
                    !Number.isFinite(field.y) ||
                    !Number.isFinite(field.width) ||
                    !Number.isFinite(field.height)
                ) {
                    return null;
                }
                return {
                    x: field.x + field.width / 2,
                    y: field.y + field.height / 2
                };
            }
            return null;
        })();

        if (center) {
            this.fieldCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            this.fieldCtx.lineWidth = 1.5;
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(center.x - 7, center.y);
            this.fieldCtx.lineTo(center.x + 7, center.y);
            this.fieldCtx.moveTo(center.x, center.y - 7);
            this.fieldCtx.lineTo(center.x, center.y + 7);
            this.fieldCtx.stroke();

            this.fieldCtx.fillStyle = 'rgba(20, 30, 48, 0.95)';
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
            this.fieldCtx.fill();
        }

        // 绘制磁场符号阵列（· / ×）
        const spacing = 40;
        const dotRadius = 3;
        const crossOffset = 4.5;

        // Clip to shape so symbols won't leak outside circle/triangle.
        beginShapePath();
        this.fieldCtx.save();
        this.fieldCtx.clip();

        this.fieldCtx.strokeStyle = symbolColor;
        this.fieldCtx.fillStyle = symbolColor;
        this.fieldCtx.lineWidth = 1.8;

        for (let x = bounds.minX + spacing / 2; x < bounds.maxX; x += spacing) {
            for (let y = bounds.minY + spacing / 2; y < bounds.maxY; y += spacing) {
                if (!hasDirection) continue;

                if (strength > 0) {
                    // ·：指向屏幕外
                    this.fieldCtx.beginPath();
                    this.fieldCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
                    this.fieldCtx.fill();
                } else {
                    // ×：指向屏幕内
                    this.fieldCtx.beginPath();
                    this.fieldCtx.moveTo(x - crossOffset, y - crossOffset);
                    this.fieldCtx.lineTo(x + crossOffset, y + crossOffset);
                    this.fieldCtx.moveTo(x + crossOffset, y - crossOffset);
                    this.fieldCtx.lineTo(x - crossOffset, y + crossOffset);
                    this.fieldCtx.stroke();
                }
            }
        }

        this.fieldCtx.restore();

        // 选中高亮 + 缩放控制点（仅磁场）
        if (scene && field === scene.selectedObject) {
            // 选中边界
            beginShapePath();
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2.5;
            this.fieldCtx.setLineDash([5, 5]);
            this.fieldCtx.stroke();
            this.fieldCtx.setLineDash([]);

            // 缩放控制点
            const handles = [];
            if (shape === 'circle') {
                const r = Math.max(0, field.radius ?? 0);
                handles.push({ key: 'radius', x: field.x + r, y: field.y });
            } else if (shape === 'triangle') {
                const x = field.x;
                const y = field.y;
                const w = field.width ?? 0;
                const h = field.height ?? 0;
                handles.push({ key: 'apex', x: x + w / 2, y });
                handles.push({ key: 'bl', x, y: y + h });
                handles.push({ key: 'br', x: x + w, y: y + h });
            } else {
                const x = field.x;
                const y = field.y;
                const w = field.width ?? 0;
                const h = field.height ?? 0;
                handles.push({ key: 'nw', x, y });
                handles.push({ key: 'ne', x: x + w, y });
                handles.push({ key: 'sw', x, y: y + h });
                handles.push({ key: 'se', x: x + w, y: y + h });
            }

            const size = 10;
            this.fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2;
            for (const handle of handles) {
                this.fieldCtx.beginPath();
                this.fieldCtx.rect(handle.x - size / 2, handle.y - size / 2, size, size);
                this.fieldCtx.fill();
                this.fieldCtx.stroke();
            }
        }

        // 显示场强（便于查看）
        const bVal = Number.isFinite(field.strength) ? field.strength : 0;
        this.drawTextBadge(this.fieldCtx, bounds.minX + 8, bounds.minY + 18, `B: ${this.formatNumber(bVal)} T`);

        this.fieldCtx.restore();
    }

    drawDisappearZone(zone, scene) {
        this.fieldCtx.save();

        const isDarkTheme = document.body.classList.contains('dark-theme') ||
            (!document.body.classList.contains('light-theme'));
        const color = isDarkTheme ? 'rgba(255, 120, 120, 0.9)' : 'rgba(220, 60, 60, 0.9)';

        const length = Number.isFinite(zone.length) ? zone.length : 0;
        const lineWidth = Number.isFinite(zone.lineWidth) ? zone.lineWidth : 6;
        const angle = (Number.isFinite(zone.angle) ? zone.angle : 0) * Math.PI / 180;

        this.fieldCtx.translate(zone.x, zone.y);
        this.fieldCtx.rotate(angle);

        this.fieldCtx.strokeStyle = color;
        this.fieldCtx.lineWidth = lineWidth;
        this.fieldCtx.lineCap = 'round';
        this.fieldCtx.setLineDash([12, 8]);
        this.fieldCtx.beginPath();
        this.fieldCtx.moveTo(-length / 2, 0);
        this.fieldCtx.lineTo(length / 2, 0);
        this.fieldCtx.stroke();
        this.fieldCtx.setLineDash([]);

        // 选中高亮
        if (scene && zone === scene.selectedObject) {
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2;
            this.fieldCtx.setLineDash([5, 5]);
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(-length / 2, 0);
            this.fieldCtx.lineTo(length / 2, 0);
            this.fieldCtx.stroke();
            this.fieldCtx.setLineDash([]);

            // 端点提示
            const size = 10;
            this.fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2;
            for (const x of [-length / 2, length / 2]) {
                this.fieldCtx.beginPath();
                this.fieldCtx.rect(x - size / 2, -size / 2, size, size);
                this.fieldCtx.fill();
                this.fieldCtx.stroke();
            }
        }

        this.fieldCtx.restore();
    }

    drawFluorescentScreen(screen, scene) {
        this.fieldCtx.save();

        const time = scene.time || 0;
        const frontX = screen.x;
        const frontY = screen.y;
        const frontW = screen.width;
        const frontH = screen.height;
        const sideW = screen.depth;
        const gap = screen.viewGap ?? 12;
        const sideX = (frontX - frontW / 2) - gap - sideW / 2;

        // 侧视矩形（在左侧）
        const sideRect = {
            x: sideX - sideW / 2,
            y: frontY - frontH / 2,
            w: sideW,
            h: frontH
        };
        this.fieldCtx.fillStyle = 'rgba(120, 140, 160, 0.5)';
        this.fieldCtx.strokeStyle = 'rgba(80, 90, 100, 0.9)';
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.fillRect(sideRect.x, sideRect.y, sideRect.w, sideRect.h);
        this.fieldCtx.strokeRect(sideRect.x, sideRect.y, sideRect.w, sideRect.h);

        // 正视方形屏幕
        const frontRect = {
            x: frontX - frontW / 2,
            y: frontY - frontH / 2,
            w: frontW,
            h: frontH
        };
        this.fieldCtx.fillStyle = 'rgba(30, 60, 40, 0.6)';
        this.fieldCtx.strokeStyle = 'rgba(120, 200, 120, 0.9)';
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.fillRect(frontRect.x, frontRect.y, frontRect.w, frontRect.h);
        this.fieldCtx.strokeRect(frontRect.x, frontRect.y, frontRect.w, frontRect.h);

        // 光斑
        screen.pruneHits(time);
        for (const hit of screen.hits) {
            const age = time - hit.time;
            const alpha = Math.max(0, 1 - age / screen.persistence);
            const cx = frontX + hit.x;
            const cy = frontY + hit.y;
            this.fieldCtx.save();
            this.fieldCtx.fillStyle = `rgba(120, 255, 120, ${0.2 + 0.8 * alpha})`;
            this.fieldCtx.shadowColor = 'rgba(120, 255, 120, 0.6)';
            this.fieldCtx.shadowBlur = 8;
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(cx, cy, screen.spotSize, 0, Math.PI * 2);
            this.fieldCtx.fill();
            this.fieldCtx.restore();
        }

        // 选中高亮
        if (screen === scene.selectedObject) {
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.setLineDash([5, 5]);
            this.fieldCtx.lineWidth = 2;
            this.fieldCtx.strokeRect(frontRect.x - 4, frontRect.y - 4, frontRect.w + 8, frontRect.h + 8);
        }

        this.fieldCtx.restore();
    }

    drawElectronGun(emitter, scene) {
        const originX = Number.isFinite(emitter?.x) ? emitter.x : 0;
        const originY = Number.isFinite(emitter?.y) ? emitter.y : 0;

        // 点状发射器：中心点即发射原点
        this.fieldCtx.save();
        this.fieldCtx.fillStyle = '#6c9bf4';
        this.fieldCtx.strokeStyle = '#2c5aa0';
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.beginPath();
        this.fieldCtx.arc(originX, originY, 6, 0, Math.PI * 2);
        this.fieldCtx.fill();
        this.fieldCtx.stroke();

        this.fieldCtx.fillStyle = '#ffffff';
        this.fieldCtx.beginPath();
        this.fieldCtx.arc(originX, originY, 2, 0, Math.PI * 2);
        this.fieldCtx.fill();
        this.fieldCtx.restore();

        // 叠加显示（速度/能量）
        if (emitter.showVelocity || emitter.showEnergy) {
            const pixelsPerMeter = Number.isFinite(scene?.settings?.pixelsPerMeter) && scene.settings.pixelsPerMeter > 0
                ? scene.settings.pixelsPerMeter
                : 1;
            const angle = emitter.direction * Math.PI / 180;

            if (emitter.showVelocity) {
                if (emitter.velocityDisplayMode === 'speed') {
                    const speed = (Number.isFinite(emitter.emissionSpeed) ? emitter.emissionSpeed : 0) / pixelsPerMeter;
                    this.drawTextBadge(
                        this.fieldCtx,
                        emitter.x + 18,
                        emitter.y - 18,
                        `v0: ${this.formatNumber(speed)} m/s`
                    );
                } else {
                    const vScale = 0.08;
                    let dx = Math.cos(angle) * emitter.emissionSpeed * vScale;
                    let dy = Math.sin(angle) * emitter.emissionSpeed * vScale;
                    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
                        dx = 0;
                        dy = 0;
                    }
                    const len = Math.hypot(dx, dy);
                    const maxLen = 140;
                    if (len > maxLen && len > 0) {
                        const s = maxLen / len;
                        dx *= s;
                        dy *= s;
                    }
                    if (Number.isFinite(len) && len > 0) {
                        this.drawArrow(this.fieldCtx, originX, originY, dx, dy, '#ffffff', 2);
                    }
                }
            }

            if (emitter.showEnergy) {
                const speed = (Number.isFinite(emitter.emissionSpeed) ? emitter.emissionSpeed : 0) / pixelsPerMeter;
                const mass = Number.isFinite(emitter.particleMass) ? emitter.particleMass : 0;
                const Ek = 0.5 * mass * speed * speed;
                this.drawTextBadge(
                    this.fieldCtx,
                    emitter.x + 18,
                    emitter.y - 2,
                    `Ek0: ${this.formatNumber(Ek * 1e9)} nJ`
                );
            }
        }

        // 选中高亮
        if (emitter === scene.selectedObject) {
            this.fieldCtx.save();
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2.5;
            this.fieldCtx.setLineDash([5, 5]);
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(originX, originY, 14, 0, Math.PI * 2);
            this.fieldCtx.stroke();
            this.fieldCtx.restore();
        }
    }

    drawProgrammableEmitter(emitter, scene) {
        const originX = Number.isFinite(emitter?.x) ? emitter.x : 0;
        const originY = Number.isFinite(emitter?.y) ? emitter.y : 0;

        // 点状发射器：中心点即发射原点
        this.fieldCtx.save();
        this.fieldCtx.fillStyle = '#7bd389';
        this.fieldCtx.strokeStyle = '#2e7d32';
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.beginPath();
        this.fieldCtx.arc(originX, originY, 6, 0, Math.PI * 2);
        this.fieldCtx.fill();
        this.fieldCtx.stroke();

        this.fieldCtx.fillStyle = '#ffffff';
        this.fieldCtx.beginPath();
        this.fieldCtx.arc(originX, originY, 2, 0, Math.PI * 2);
        this.fieldCtx.fill();
        this.fieldCtx.restore();

        // 选中高亮
        if (emitter === scene.selectedObject) {
            this.fieldCtx.save();
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 2.5;
            this.fieldCtx.setLineDash([5, 5]);
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(originX, originY, 14, 0, Math.PI * 2);
            this.fieldCtx.stroke();
            this.fieldCtx.restore();
        }
    }

    renderParticles(scene) {
        this.particleCtx.clearRect(0, 0, this.width, this.height);
        const { offsetX, offsetY } = this.getCameraOffset(scene);
        this.particleCtx.save();
        this.particleCtx.translate(offsetX, offsetY);

        for (const particle of scene.particles) {
            // 绘制轨迹
            if (scene.settings.showTrajectories && particle.showTrajectory) {
                this.trajectoryRenderer.render(this.particleCtx, particle);
            }

            // 绘制粒子主体
            this.drawParticle(particle);

            // 绘制速度信息（矢量或数值）
            if (particle.showVelocity) {
                if (particle.velocityDisplayMode === 'speed') {
                    this.drawSpeedInfo(particle);
                } else {
                    const vScale = 0.1;
                    let dx = particle.velocity.x * vScale;
                    let dy = particle.velocity.y * vScale;
                    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
                        dx = 0;
                        dy = 0;
                    }
                    const len = Math.hypot(dx, dy);
                    const maxLen = 120;
                    if (len > maxLen && len > 0) {
                        const s = maxLen / len;
                        dx *= s;
                        dy *= s;
                    }
                    if (Number.isFinite(len) && len > 0) {
                        this.drawArrow(this.particleCtx, particle.position.x, particle.position.y, dx, dy, 'white', 2);
                    }
                }
            }

            // 绘制能量信息
            if (scene.settings.showEnergy && particle.showEnergy) {
                this.drawEnergyInfo(particle);
            }

            // 受力分析（可选）
            if (particle.showForces) {
                this.drawForceAnalysis(particle, scene);
            }

            // 选中高亮
            if (particle === scene.selectedObject) {
                this.drawParticleSelection(particle);
            }
        }
        this.particleCtx.restore();
    }

    drawParticle(particle) {
        this.particleCtx.save();
        const radius = Number.isFinite(this.particleRenderRadius) ? this.particleRenderRadius : 6;

        // 粒子主体
        this.particleCtx.beginPath();
        this.particleCtx.arc(particle.position.x, particle.position.y, radius, 0, Math.PI * 2);
        this.particleCtx.fillStyle = particle.charge > 0 ? '#ff4444' : '#4444ff';
        this.particleCtx.fill();

        // 粒子边框
        this.particleCtx.strokeStyle = 'white';
        this.particleCtx.lineWidth = 2;
        this.particleCtx.stroke();

        this.particleCtx.restore();
    }

    drawParticleSelection(particle) {
        this.particleCtx.save();
        this.particleCtx.strokeStyle = '#0e639c';
        this.particleCtx.lineWidth = 3;
        this.particleCtx.setLineDash([5, 5]);
        const radius = (Number.isFinite(this.particleRenderRadius) ? this.particleRenderRadius : 6) +
            (Number.isFinite(this.particleSelectionPadding) ? this.particleSelectionPadding : 10);
        this.particleCtx.beginPath();
        this.particleCtx.arc(particle.position.x, particle.position.y, radius, 0, Math.PI * 2);
        this.particleCtx.stroke();
        this.particleCtx.setLineDash([]);
        this.particleCtx.restore();
    }

    drawArrow(ctx, x, y, dx, dy, color = 'white', lineWidth = 2) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 5) return;

        const angle = Math.atan2(dy, dx);
        const headLen = 8;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;

        // 箭头线
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();

        // 箭头头部
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(
            x + dx - headLen * Math.cos(angle - Math.PI / 6),
            y + dy - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x + dx - headLen * Math.cos(angle + Math.PI / 6),
            y + dy - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    formatNumber(value) {
        if (!Number.isFinite(value)) return '0';
        const abs = Math.abs(value);
        if (abs === 0) return '0';
        if (abs < 0.01 || abs >= 1e5) return value.toExponential(2);
        if (abs < 1) return value.toFixed(3).replace(/\.?0+$/, '');
        if (abs < 10) return value.toFixed(2);
        if (abs < 100) return value.toFixed(1);
        return value.toFixed(0);
    }

    drawTextBadge(ctx, x, y, text) {
        ctx.save();
        ctx.font = '11px monospace';
        const paddingX = 6;
        const paddingY = 4;
        const metrics = ctx.measureText(text);
        const width = Math.ceil(metrics.width) + paddingX * 2;
        const height = 14 + paddingY * 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - paddingX, y - 11 - paddingY, width, height);

        ctx.fillStyle = 'white';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    drawSpeedInfo(particle) {
        const pixelsPerMeter = Number.isFinite(particle.scene?.settings?.pixelsPerMeter) && particle.scene.settings.pixelsPerMeter > 0
            ? particle.scene.settings.pixelsPerMeter
            : 1;
        const speed = particle.velocity.magnitude() / pixelsPerMeter;
        const x = particle.position.x + 15;
        const y = particle.position.y + 20;
        this.drawTextBadge(this.particleCtx, x, y, `v: ${this.formatNumber(speed)} m/s`);
    }

    drawEnergyInfo(particle) {
        const Ek = particle.getKineticEnergy();
        const x = particle.position.x + 15;
        const y = particle.position.y - 15;

        this.drawTextBadge(this.particleCtx, x, y, `Ek: ${this.formatNumber(Ek * 1e9)} nJ`);
    }

    forceVectorToArrow(force) {
        const fx = Number.isFinite(force?.x) ? force.x : 0;
        const fy = Number.isFinite(force?.y) ? force.y : 0;
        const mag = Math.hypot(fx, fy);
        if (!Number.isFinite(mag) || mag <= 0) {
            return null;
        }

        // N -> 像素箭头长度：按对数缩放，保证小量也不至于全是0
        const log = Math.log10(mag);
        const len = Math.max(0, Math.min(90, (log + 30) * 4));
        if (len < 4) return null;
        return { dx: (fx / mag) * len, dy: (fy / mag) * len, mag };
    }

    drawForceAnalysis(particle, scene) {
        if (!this.particleCtx || !this.forceCalculator) return;
        const gravity = Number.isFinite(scene?.settings?.gravity) ? scene.settings.gravity : 10;
        const breakdown = this.forceCalculator.calculateForceBreakdown(particle, scene, gravity);

        const items = [];
        if (particle.showForceElectric) {
            items.push({ key: 'Fe', force: breakdown.electric, color: 'rgba(255, 200, 0, 0.95)' });
        }
        if (particle.showForceMagnetic) {
            items.push({ key: 'Fm', force: breakdown.magnetic, color: 'rgba(160, 120, 255, 0.95)' });
        }
        if (particle.showForceGravity) {
            items.push({ key: 'Fg', force: breakdown.gravity, color: 'rgba(120, 255, 160, 0.95)' });
        }
        if (particle.showForceNet || (!particle.showForceElectric && !particle.showForceMagnetic && !particle.showForceGravity)) {
            items.push({ key: 'ΣF', force: breakdown.total, color: 'rgba(255, 255, 255, 0.95)' });
        }

        const originX = particle.position.x;
        const originY = particle.position.y;

        let textY = originY + 45;
        const textX = originX + 15;

        for (const item of items) {
            const arrow = this.forceVectorToArrow(item.force);
            if (arrow) {
                this.drawArrow(this.particleCtx, originX, originY, arrow.dx, arrow.dy, item.color, 2);
                this.drawTextBadge(
                    this.particleCtx,
                    textX,
                    textY,
                    `${item.key}: ${this.formatNumber(arrow.mag)} N`
                );
            } else {
                const mag = Math.hypot(item.force?.x ?? 0, item.force?.y ?? 0);
                this.drawTextBadge(
                    this.particleCtx,
                    textX,
                    textY,
                    `${item.key}: ${this.formatNumber(mag)} N`
                );
            }
            textY += 18;
        }
    }

    /**
     * 标记需要重绘场层
     */
    invalidateFields() {
        this.needFieldRedraw = true;
        // 立即清空画布，避免清空操作后残留旧内容
        if (this.fieldCtx && this.particleCtx) {
            this.fieldCtx.clearRect(0, 0, this.width, this.height);
            this.particleCtx.clearRect(0, 0, this.width, this.height);
        }
    }
}
