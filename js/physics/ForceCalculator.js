/**
 * 力计算器 - 计算电场力、磁场力和重力
 */

import { Vector } from './VectorMath.js';

export class ForceCalculator {
    getPixelsPerMeter(scene) {
        const value = scene?.settings?.pixelsPerMeter;
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    /**
     * 计算粒子受到的总力
     */
    calculateTotalForce(particle, scene, gravity) {
        let totalForce = Vector.zero();
        
        // 电场力: F = qE
        const electricForce = this.calculateElectricForce(particle, scene);
        totalForce = totalForce.add(electricForce);
        
        // 磁场力: F = q(v × B)
        const magneticForce = this.calculateMagneticForce(particle, scene);
        totalForce = totalForce.add(magneticForce);
        
        // 重力: F = mg
        if (!particle.ignoreGravity) {
            const gravityForce = new Vector(0, particle.mass * gravity, 0);
            totalForce = totalForce.add(gravityForce);
        }
        
        return totalForce;
    }

    /**
     * 计算受力分解（便于显示/分析）
     */
    calculateForceBreakdown(particle, scene, gravity) {
        const electric = this.calculateElectricForce(particle, scene);
        const magnetic = this.calculateMagneticForce(particle, scene);
        const g = (!particle.ignoreGravity && Number.isFinite(particle.mass) && Number.isFinite(gravity))
            ? new Vector(0, particle.mass * gravity, 0)
            : Vector.zero();
        const total = electric.add(magnetic).add(g);
        return { electric, magnetic, gravity: g, total };
    }
    
    /**
     * 计算电场力
     */
    calculateElectricForce(particle, scene) {
        const E = scene.getElectricField(particle.position.x, particle.position.y);
        
        // F = qE
        return new Vector(
            particle.charge * E.x,
            particle.charge * E.y,
            0
        );
    }
    
    /**
     * 计算磁场力（洛伦兹力）
     */
    calculateMagneticForce(particle, scene) {
        const Bz = scene.getMagneticField(particle.position.x, particle.position.y);
        const pixelsPerMeter = this.getPixelsPerMeter(scene);
        const vx = particle.velocity.x / pixelsPerMeter;
        const vy = particle.velocity.y / pixelsPerMeter;
        
        // 2D中的磁场只有z分量
        // B = (0, 0, Bz)
        // v = (vx, vy, 0)
        // 注意：画布坐标系 y 轴向下（左手系），需对洛伦兹力方向做符号修正
        // F = q(v × B) = q(-vy*Bz, vx*Bz, 0)
        
        return new Vector(
            -particle.charge * vy * Bz,
            particle.charge * vx * Bz,
            0
        );
    }
}
