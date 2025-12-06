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
        for (const particle of scene.particles) {
            if (!particle.active) continue;
            if (particle.stuckToCapacitor) {
                // Already stuck to a plate; keep it static.
                continue;
            }
            
            // Use RK4 integration to advance position/velocity.
            this.integrator.updateParticle(particle, scene, dt, this.gravity);
            
            // Collisions and boundaries.
            this.handleCapacitorCollision(particle, scene);
            this.handleBoundaries(particle, scene);
        }
    }
    
    /**
     * Boundary handling with simple bounce.
     */
    handleBoundaries(particle, scene) {
        const canvasContainer = document.getElementById('canvas-container');
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        
        if (particle.position.x < particle.radius) {
            particle.position.x = particle.radius;
            particle.velocity.x *= -0.9; // restitution
        } else if (particle.position.x > width - particle.radius) {
            particle.position.x = width - particle.radius;
            particle.velocity.x *= -0.9;
        }
        
        if (particle.position.y < particle.radius) {
            particle.position.y = particle.radius;
            particle.velocity.y *= -0.9;
        } else if (particle.position.y > height - particle.radius) {
            particle.position.y = height - particle.radius;
            particle.velocity.y *= -0.9;
        }
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
