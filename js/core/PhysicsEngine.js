/**
 * Physics engine - RK4 integration and force calculations
 */

import { ForceCalculator } from '../physics/ForceCalculator.js';
import { Integrator } from '../physics/Integrator.js';
import { registry } from './registerObjects.js';

export class PhysicsEngine {
    constructor() {
        this.forceCalculator = new ForceCalculator();
        this.integrator = new Integrator();
        this.gravity = 10; // m/s^2
        this.restitution = 0.9; // 边界反弹恢复系数
    }
    
    /**
     * Update physics state for all active particles.
     */
    update(scene, dt) {
        const toRemove = [];
        const gravity = Number.isFinite(scene?.settings?.gravity) ? scene.settings.gravity : this.gravity;
        let boundsWidth = scene.viewport?.width ?? 0;
        let boundsHeight = scene.viewport?.height ?? 0;

        if (!boundsWidth || !boundsHeight) {
            const canvasContainer = document.getElementById('canvas-container');
            boundsWidth = canvasContainer?.clientWidth ?? 0;
            boundsHeight = canvasContainer?.clientHeight ?? 0;
        }

        const objects = scene.objects || scene.getAllObjects();
        const updateHooks = [];
        const particleHooks = [];

        for (const object of objects) {
            const entry = registry.get(object?.type);
            const hooks = entry?.physicsHooks;
            if (!hooks) continue;
            if (typeof hooks.onUpdate === 'function') {
                updateHooks.push({ fn: hooks.onUpdate, object });
            }
            if (typeof hooks.onParticleStep === 'function') {
                particleHooks.push({
                    stage: Number.isFinite(hooks.stage) ? hooks.stage : 0,
                    fn: hooks.onParticleStep,
                    object
                });
            }
        }

        particleHooks.sort((a, b) => a.stage - b.stage);

        // Update hooks (emitters, etc.)
        if (updateHooks.length) {
            for (const hook of updateHooks) {
                hook.fn(this, scene, hook.object, dt);
            }
        }

        const hasContinuousColliders = particleHooks.length > 0;

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
                this.integrator.updateParticle(particle, scene, stepDt, gravity);

                // Collisions and boundaries.
                let removed = false;
                for (const hook of particleHooks) {
                    if (hook.fn(this, scene, particle, hook.object)) {
                        removed = true;
                        break;
                    }
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
            const uniqueToRemove = [...new Set(toRemove)];
            if (typeof scene.removeObject === 'function') {
                for (const particle of uniqueToRemove) {
                    scene.removeObject(particle);
                }
            } else {
                scene.particles = scene.particles.filter(p => !uniqueToRemove.includes(p));
                if (Array.isArray(scene.objects)) {
                    scene.objects = scene.objects.filter(object => !uniqueToRemove.includes(object));
                }
            }
            if (uniqueToRemove.includes(scene.selectedObject)) {
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

        const x = particle.position.x;
        const y = particle.position.y;
        const vx = particle.velocity.x;
        const vy = particle.velocity.y;

        // 数值异常时直接移除，避免粒子被夹到角落“幽灵出现”
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(vx) || !Number.isFinite(vy)) {
            return true;
        }

        let minX;
        let maxX;
        let minY;
        let maxY;
        if (typeof scene?.getWorldViewportBounds === 'function') {
            const bounds = scene.getWorldViewportBounds(0);
            minX = bounds.minX;
            maxX = bounds.maxX;
            minY = bounds.minY;
            maxY = bounds.maxY;
        } else {
            const offsetX = Number.isFinite(scene?.camera?.offsetX) ? scene.camera.offsetX : 0;
            const offsetY = Number.isFinite(scene?.camera?.offsetY) ? scene.camera.offsetY : 0;
            const normalizeZero = (value) => (Object.is(value, -0) ? 0 : value);
            minX = normalizeZero(-offsetX);
            maxX = normalizeZero(width - offsetX);
            minY = normalizeZero(-offsetY);
            maxY = normalizeZero(height - offsetY);
        }

        if (mode === 'remove' || mode === 'margin') {
            const extra = mode === 'margin' ? margin : 0;
            const minXRemove = minX - extra;
            const maxXRemove = maxX + extra;
            const minYRemove = minY - extra;
            const maxYRemove = maxY + extra;

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

    handleDisappearZoneHit(particle, scene, zoneOverride = null) {
        const zones = zoneOverride ? [zoneOverride] : (scene.disappearZones || []);
        if (!zones.length) return false;

        const prevX = particle.prevX ?? particle.position.x;
        const prevY = particle.prevY ?? particle.position.y;
        const currX = particle.position.x;
        const currY = particle.position.y;
        for (const zone of zones) {
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
            const threshold = lineWidth / 2;

            const dist = this.segmentDistance(prevX, prevY, currX, currY, x1, y1, x2, y2);
            if (dist <= threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * Parallel-plate capacitor collision: stop particle when it hits a plate.
     */
    handleCapacitorCollision(particle, scene, fieldOverride = null) {
        let collided = false;

        const fields = fieldOverride ? [fieldOverride] : (scene.electricFields || []);
        for (const field of fields) {
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
            if (Math.abs(alongPlate) <= halfWidth && Math.abs(alongField) >= halfDist) {
                const sign = Math.sign(alongField) || 1;
                const clampedAlongField = sign * halfDist;

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

        return collided;
    }
}
