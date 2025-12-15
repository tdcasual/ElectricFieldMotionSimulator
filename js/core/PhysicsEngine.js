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

        for (const particle of scene.particles) {
            if (!particle.active) continue;
            if (particle.stuckToCapacitor) {
                continue;
            }
            
            // 保存上一帧位置用于屏幕碰撞检测
            particle.prevX = particle.position.x;
            particle.prevY = particle.position.y;

            // Integrate motion
            this.integrator.updateParticle(particle, scene, dt, this.gravity);
            
            // Collisions and boundaries.
            this.handleCapacitorCollision(particle, scene);
            let removed = this.handleScreenHit(particle, scene);
            if (!removed) {
                removed = this.handleBoundaries(particle, boundsWidth, boundsHeight);
            }
            if (removed) {
                toRemove.push(particle);
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
     * Boundary handling: now remove when out of bounds.
     */
    handleBoundaries(particle, width, height) {
        if (!width || !height) return false;
        
        if (particle.position.x < particle.radius) {
            return true;
        } else if (particle.position.x > width - particle.radius) {
            return true;
        }
        
        if (particle.position.y < particle.radius) {
            return true;
        } else if (particle.position.y > height - particle.radius) {
            return true;
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
