/**
 * Physics engine - RK4 integration and force calculations
 */

import { ForceCalculator } from '../physics/ForceCalculator.js';
import { Integrator } from '../physics/Integrator.js';

export class PhysicsEngine {
    constructor() {
        this.forceCalculator = new ForceCalculator();
        this.integrator = new Integrator();
        this.gravity = 9.8; // m/s^2
        this.restitution = 0.9; // 边界反弹恢复系数
    }
    
    /**
     * Update physics state for all active particles.
     */
    update(scene, dt) {
        const toRemove = [];
        let boundsWidth = scene.viewport?.width ?? 0;
        let boundsHeight = scene.viewport?.height ?? 0;

        if (!boundsWidth || !boundsHeight) {
            const canvasContainer = document.getElementById('canvas-container');
            boundsWidth = canvasContainer?.clientWidth ?? 0;
            boundsHeight = canvasContainer?.clientHeight ?? 0;
        }

        // Emitters
        if (scene.emitters && scene.emitters.length) {
            for (const emitter of scene.emitters) {
                if (typeof emitter.update === 'function') {
                    emitter.update(dt, scene);
                }
            }
        }

        const hasContinuousColliders =
            (scene.disappearZones && scene.disappearZones.length) ||
            (scene.screens && scene.screens.length);

        for (const particle of scene.particles) {
            if (!particle.active) continue;
            if (particle.stuckToCapacitor) {
                continue;
            }

            const speed = Math.hypot(particle.velocity.x, particle.velocity.y);
            const displacement = (Number.isFinite(speed) ? speed : 0) * dt;
            const maxStepDistance = 12;
            const subSteps = hasContinuousColliders
                ? Math.max(1, Math.min(50, Math.ceil(displacement / maxStepDistance)))
                : 1;
            const stepDt = dt / subSteps;

            for (let step = 0; step < subSteps; step++) {
                // 保存上一帧位置用于碰撞检测
                particle.prevX = particle.position.x;
                particle.prevY = particle.position.y;

                // Integrate motion
                this.integrator.updateParticle(particle, scene, stepDt, this.gravity);

                // Collisions and boundaries.
                this.handleCapacitorCollision(particle, scene);
                let removed = this.handleDisappearZoneHit(particle, scene);
                if (!removed) {
                    removed = this.handleScreenHit(particle, scene);
                }
                if (!removed) {
                    removed = this.handleBoundaries(particle, scene, boundsWidth, boundsHeight);
                }
                if (removed) {
                    toRemove.push(particle);
                    break;
                }
            }
        }

        // Remove particles
        if (toRemove.length) {
            scene.particles = scene.particles.filter(p => !toRemove.includes(p));
            if (toRemove.includes(scene.selectedObject)) {
                scene.selectedObject = null;
            }
        }
    }
    
    /**
     * Boundary handling: remove / bounce / wrap / margin-remove.
     */
    handleBoundaries(particle, scene, width, height) {
        if (!width || !height) return false;

        const mode = scene?.settings?.boundaryMode || 'bounce';
        const marginSetting = scene?.settings?.boundaryMargin;
        const margin = Number.isFinite(marginSetting) && marginSetting >= 0 ? marginSetting : 0;

        const radius = Number.isFinite(particle.radius) ? particle.radius : 0;
        const x = particle.position.x;
        const y = particle.position.y;
        const vx = particle.velocity.x;
        const vy = particle.velocity.y;

        // 数值异常时直接移除，避免粒子被夹到角落“幽灵出现”
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
            return true;
        }

        const minX = radius;
        const maxX = width - radius;
        const minY = radius;
        const maxY = height - radius;

        if (mode === 'remove' || mode === 'margin') {
            const extra = mode === 'margin' ? margin : 0;
            const minXRemove = -radius - extra;
            const maxXRemove = width + radius + extra;
            const minYRemove = -radius - extra;
            const maxYRemove = height + radius + extra;

            if (x < minXRemove || x > maxXRemove || y < minYRemove || y > maxYRemove) {
                return true;
            }
            return false;
        }

        if (mode === 'wrap') {
            let wrapped = false;
            if (x < minX) {
                particle.position.x = maxX;
                wrapped = true;
            } else if (x > maxX) {
                particle.position.x = minX;
                wrapped = true;
            }

            if (y < minY) {
                particle.position.y = maxY;
                wrapped = true;
            } else if (y > maxY) {
                particle.position.y = minY;
                wrapped = true;
            }

            if (wrapped && typeof particle.clearTrajectory === 'function') {
                particle.clearTrajectory();
            }
            return false;
        }

        let bounced = false;

        if (x < minX) {
            particle.position.x = minX;
            particle.velocity.x = Math.abs(vx) * this.restitution;
            bounced = true;
        } else if (x > maxX) {
            particle.position.x = maxX;
            particle.velocity.x = -Math.abs(vx) * this.restitution;
            bounced = true;
        }

        if (y < minY) {
            particle.position.y = minY;
            particle.velocity.y = Math.abs(vy) * this.restitution;
            bounced = true;
        } else if (y > maxY) {
            particle.position.y = maxY;
            particle.velocity.y = -Math.abs(vy) * this.restitution;
            bounced = true;
        }

        if (bounced && typeof particle.clearTrajectory === 'function') {
            particle.clearTrajectory();
        }

        return false;
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

    segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        const orient = (px, py, qx, qy, rx, ry) => {
            const val = (qy - py) * (rx - qx) - (qx - px) * (ry - qy);
            if (val === 0) return 0;
            return val > 0 ? 1 : 2;
        };
        const onSegment = (px, py, qx, qy, rx, ry) => {
            return qx <= Math.max(px, rx) && qx >= Math.min(px, rx) &&
                   qy <= Math.max(py, ry) && qy >= Math.min(py, ry);
        };

        const o1 = orient(ax, ay, bx, by, cx, cy);
        const o2 = orient(ax, ay, bx, by, dx, dy);
        const o3 = orient(cx, cy, dx, dy, ax, ay);
        const o4 = orient(cx, cy, dx, dy, bx, by);

        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && onSegment(ax, ay, cx, cy, bx, by)) return true;
        if (o2 === 0 && onSegment(ax, ay, dx, dy, bx, by)) return true;
        if (o3 === 0 && onSegment(cx, cy, ax, ay, dx, dy)) return true;
        if (o4 === 0 && onSegment(cx, cy, bx, by, dx, dy)) return true;
        return false;
    }

    segmentDistance(ax, ay, bx, by, cx, cy, dx, dy) {
        if (this.segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
        const d1 = this.distancePointToSegment(ax, ay, cx, cy, dx, dy);
        const d2 = this.distancePointToSegment(bx, by, cx, cy, dx, dy);
        const d3 = this.distancePointToSegment(cx, cy, ax, ay, bx, by);
        const d4 = this.distancePointToSegment(dx, dy, ax, ay, bx, by);
        return Math.min(d1, d2, d3, d4);
    }

    handleDisappearZoneHit(particle, scene) {
        if (!scene.disappearZones || !scene.disappearZones.length) return false;

        const prevX = particle.prevX ?? particle.position.x;
        const prevY = particle.prevY ?? particle.position.y;
        const currX = particle.position.x;
        const currY = particle.position.y;
        const radius = Number.isFinite(particle.radius) ? particle.radius : 0;

        for (const zone of scene.disappearZones) {
            if (!zone || zone.type !== 'disappear-zone') continue;
            const length = Number.isFinite(zone.length) ? zone.length : 0;
            if (length <= 0) continue;
            const angle = (Number.isFinite(zone.angle) ? zone.angle : 0) * Math.PI / 180;
            const dx = Math.cos(angle) * (length / 2);
            const dy = Math.sin(angle) * (length / 2);
            const x1 = zone.x - dx;
            const y1 = zone.y - dy;
            const x2 = zone.x + dx;
            const y2 = zone.y + dy;

            const lineWidth = Number.isFinite(zone.lineWidth) ? zone.lineWidth : 6;
            const threshold = radius + lineWidth / 2;

            const dist = this.segmentDistance(prevX, prevY, currX, currY, x1, y1, x2, y2);
            if (dist <= threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * Fluorescent screen hit handling: record hit and remove particle.
     */
    handleScreenHit(particle, scene) {
        if (!scene.screens || !scene.screens.length) return false;
        const t = scene.time || 0;
        for (const screen of scene.screens) {
            const left = screen.x - screen.width / 2;
            const right = screen.x + screen.width / 2;
            const top = screen.y - screen.height / 2;
            const bottom = screen.y + screen.height / 2;

            // 线段与左侧面的交点检测，确保命中后停止在左侧面
            const prevX = particle.prevX ?? particle.position.x;
            const prevY = particle.prevY ?? particle.position.y;
            const currX = particle.position.x;
            const currY = particle.position.y;

            const dx = currX - prevX;
            const dy = currY - prevY;
            if (dx !== 0) {
                const ratio = (left - prevX) / dx;
                if (ratio >= 0 && ratio <= 1) {
                    const hitY = prevY + dy * ratio;
                    if (hitY >= top && hitY <= bottom) {
                        // 将粒子位置夹到左侧面，记录命中并移除
                        particle.position.x = left;
                        particle.position.y = hitY;
                        screen.recordHit(left, hitY, t);
                        return true;
                    }
                }
            }

            // 如果粒子已在屏幕内也视为命中并夹到左侧面
            if (currX >= left && currX <= right && currY >= top && currY <= bottom) {
                particle.position.x = left;
                particle.position.y = currY;
                screen.recordHit(left, currY, t);
                return true;
            }
        }
        return false;
    }

    /**
     * Parallel-plate capacitor collision: stop particle when it hits a plate.
     */
    handleCapacitorCollision(particle, scene) {
        let collided = false;

        for (const field of scene.electricFields) {
            if (field.type !== 'parallel-plate-capacitor') continue;

            const dx = particle.position.x - field.x;
            const dy = particle.position.y - field.y;

            const plateAngle = (field.direction + 90) * Math.PI / 180;
            const fieldAngle = field.direction * Math.PI / 180;
            const cosPlate = Math.cos(plateAngle);
            const sinPlate = Math.sin(plateAngle);
            const cosField = Math.cos(fieldAngle);
            const sinField = Math.sin(fieldAngle);

            const alongPlate = dx * cosPlate + dy * sinPlate;
            const alongField = dx * cosField + dy * sinField;

            const halfWidth = field.width / 2;
            const halfDist = field.plateDistance / 2;

            // Inside plate span and touching either plate surface.
            if (Math.abs(alongPlate) <= halfWidth && Math.abs(alongField) >= halfDist - particle.radius) {
                const sign = Math.sign(alongField) || 1;
                const clampedAlongField = sign * (halfDist - particle.radius);

                // Project back to space coords, stay on inner side of plate.
                particle.position.x = field.x + cosPlate * alongPlate + cosField * clampedAlongField;
                particle.position.y = field.y + sinPlate * alongPlate + sinField * clampedAlongField;

                particle.velocity.x = 0;
                particle.velocity.y = 0;
                particle.stuckToCapacitor = true;
                collided = true;
                break;
            }
        }

        // If no collision this frame, unstick.
        if (!collided && particle.stuckToCapacitor) {
            particle.stuckToCapacitor = false;
        }
    }
}
