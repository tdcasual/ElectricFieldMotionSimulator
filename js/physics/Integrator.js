/**
 * RK4数值积分器
 */

import { Vector } from './VectorMath.js';
import { ForceCalculator } from './ForceCalculator.js';

export class Integrator {
    constructor() {
        this.forceCalculator = new ForceCalculator();
    }
    
    /**
     * 使用RK4方法更新粒子状态
     */
    updateParticle(particle, scene, dt, gravity) {
        const mass = particle.mass;
        
        // RK4 四阶积分
        const k1 = this.computeDerivatives(particle, scene, gravity);
        
        const tempParticle1 = this.createTempParticle(particle, k1, dt * 0.5);
        const k2 = this.computeDerivatives(tempParticle1, scene, gravity);
        
        const tempParticle2 = this.createTempParticle(particle, k2, dt * 0.5);
        const k3 = this.computeDerivatives(tempParticle2, scene, gravity);
        
        const tempParticle3 = this.createTempParticle(particle, k3, dt);
        const k4 = this.computeDerivatives(tempParticle3, scene, gravity);
        
        // 组合四个斜率
        const dx = k1.velocity.add(k2.velocity.multiply(2))
                               .add(k3.velocity.multiply(2))
                               .add(k4.velocity)
                               .multiply(dt / 6);
        
        const dv = k1.acceleration.add(k2.acceleration.multiply(2))
                                  .add(k3.acceleration.multiply(2))
                                  .add(k4.acceleration)
                                  .multiply(dt / 6);
        
        // 更新位置和速度
        particle.position = particle.position.add(dx);
        particle.velocity = particle.velocity.add(dv);
        
        // 记录轨迹
        if (particle.showTrajectory) {
            particle.addTrajectoryPoint(particle.position.x, particle.position.y);
        }
    }
    
    /**
     * 计算导数（速度和加速度）
     */
    computeDerivatives(particle, scene, gravity) {
        // 计算总受力
        const force = this.forceCalculator.calculateTotalForce(
            particle,
            scene,
            gravity
        );
        
        // 加速度 = 力 / 质量
        const acceleration = force.divide(particle.mass);
        
        return {
            velocity: particle.velocity.clone(),
            acceleration: acceleration
        };
    }
    
    /**
     * 创建临时粒子用于RK4中间步骤
     */
    createTempParticle(particle, derivatives, dt) {
        return {
            position: particle.position.add(derivatives.velocity.multiply(dt)),
            velocity: particle.velocity.add(derivatives.acceleration.multiply(dt)),
            charge: particle.charge,
            mass: particle.mass,
            ignoreGravity: particle.ignoreGravity
        };
    }
}
