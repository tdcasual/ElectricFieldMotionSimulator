/**
 * 轨迹渲染器
 */

export class TrajectoryRenderer {
    render(ctx, particle) {
        if (particle.trajectory.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = particle.charge > 0 ? 
            'rgba(255, 68, 68, 0.6)' : 'rgba(68, 68, 255, 0.6)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(particle.trajectory[0].x, particle.trajectory[0].y);
        
        for (let i = 1; i < particle.trajectory.length; i++) {
            ctx.lineTo(particle.trajectory[i].x, particle.trajectory[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
}
