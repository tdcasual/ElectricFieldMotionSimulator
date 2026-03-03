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
import { drawElectricField } from '../rendering/electricFieldRenderer.js';
import { drawMagneticField } from '../rendering/magneticFieldRenderer.js';
import {
    drawDisappearZone,
    drawElectronGun,
    drawProgrammableEmitter
} from '../rendering/deviceRenderer.js';

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
        return drawElectricField(this, field, scene);
    }

    drawMagneticField(field, scene) {
        return drawMagneticField(this, field, scene);
    }

    drawDisappearZone(zone, scene) {
        return drawDisappearZone(this, zone, scene);
    }

    drawElectronGun(emitter, scene) {
        return drawElectronGun(this, emitter, scene);
    }

    drawProgrammableEmitter(emitter, scene) {
        return drawProgrammableEmitter(this, emitter, scene);
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

        this.drawParticleCentroidHint(particle, radius);
        this.particleCtx.restore();
    }

    drawParticleCentroidHint(particle, renderRadius) {
        const centerX = Number.isFinite(particle?.position?.x) ? particle.position.x : 0;
        const centerY = Number.isFinite(particle?.position?.y) ? particle.position.y : 0;
        const radius = Number.isFinite(renderRadius) ? renderRadius : 6;
        const crossHalf = Math.max(2.5, Math.min(4.5, radius * 0.45));
        const dotInner = Math.max(1.2, Math.min(2.2, radius * 0.22));
        const dotOuter = dotInner + 1.1;

        // 双层十字提高在深浅主题下的可见性
        this.particleCtx.strokeStyle = 'rgba(12, 16, 28, 0.9)';
        this.particleCtx.lineWidth = 2;
        this.particleCtx.beginPath();
        this.particleCtx.moveTo(centerX - crossHalf, centerY);
        this.particleCtx.lineTo(centerX + crossHalf, centerY);
        this.particleCtx.moveTo(centerX, centerY - crossHalf);
        this.particleCtx.lineTo(centerX, centerY + crossHalf);
        this.particleCtx.stroke();

        this.particleCtx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        this.particleCtx.lineWidth = 1;
        this.particleCtx.beginPath();
        this.particleCtx.moveTo(centerX - crossHalf, centerY);
        this.particleCtx.lineTo(centerX + crossHalf, centerY);
        this.particleCtx.moveTo(centerX, centerY - crossHalf);
        this.particleCtx.lineTo(centerX, centerY + crossHalf);
        this.particleCtx.stroke();

        this.particleCtx.fillStyle = 'rgba(12, 16, 28, 0.95)';
        this.particleCtx.beginPath();
        this.particleCtx.arc(centerX, centerY, dotOuter, 0, Math.PI * 2);
        this.particleCtx.fill();

        this.particleCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.particleCtx.beginPath();
        this.particleCtx.arc(centerX, centerY, dotInner, 0, Math.PI * 2);
        this.particleCtx.fill();
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
