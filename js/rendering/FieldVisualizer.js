/**
 * 场强可视化器
 */

export class FieldVisualizer {
    render(ctx, scene, width, height) {
        const spacing = 50;
        const arrowScale = 0.02;
        
        ctx.save();
        
        for (let x = spacing / 2; x < width; x += spacing) {
            for (let y = spacing / 2; y < height; y += spacing) {
                const E = scene.getElectricField(x, y);
                const magnitude = Math.sqrt(E.x * E.x + E.y * E.y);
                
                if (magnitude > 10) {
                    this.drawFieldArrow(ctx, x, y, E.x * arrowScale, E.y * arrowScale);
                }
            }
        }
        
        // 绘制磁场
        for (let x = spacing; x < width; x += spacing) {
            for (let y = spacing; y < height; y += spacing) {
                const B = scene.getMagneticField(x, y);
                if (Math.abs(B) > 0.01) {
                    this.drawMagneticField(ctx, x, y, B);
                }
            }
        }
        
        ctx.restore();
    }
    
    drawFieldArrow(ctx, x, y, dx, dy) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 2) return;
        
        const angle = Math.atan2(dy, dx);
        const headLen = 6;
        
        // 根据主题选择颜色
        const isDarkTheme = document.body.classList.contains('dark-theme') || 
                           (!document.body.classList.contains('light-theme'));
        const color = isDarkTheme ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255, 150, 0, 0.7)';
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.5;
        
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
    }
    
    drawMagneticField(ctx, x, y, B) {
        // 根据主题选择颜色
        const isDarkTheme = document.body.classList.contains('dark-theme') || 
                           (!document.body.classList.contains('light-theme'));
        
        const radius = 4;
        
        if (B > 0) {
            // 点表示磁场指向屏幕外
            const color = isDarkTheme ? 'rgba(100, 150, 255, 0.6)' : 'rgba(100, 150, 255, 0.7)';
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 叉表示磁场指向屏幕内
            const color = isDarkTheme ? 'rgba(200, 100, 200, 0.6)' : 'rgba(200, 100, 200, 0.7)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            const offset = radius * 0.7;
            
            ctx.beginPath();
            ctx.moveTo(x - offset, y - offset);
            ctx.lineTo(x + offset, y + offset);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x + offset, y - offset);
            ctx.lineTo(x - offset, y + offset);
            ctx.stroke();
        }
    }
}
