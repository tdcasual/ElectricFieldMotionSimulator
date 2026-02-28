/**
 * 场强可视化器
 */

export class FieldVisualizer {
    render(ctx, scene, width, height, options = {}) {
        const spacing = 50;
        const arrowScale = 0.03; // 场强到箭头长度的比例
        const minArrowLen = 6;
        const maxArrowLen = 22;
        const offsetX = Number.isFinite(options.offsetX) ? options.offsetX : 0;
        const offsetY = Number.isFinite(options.offsetY) ? options.offsetY : 0;
        
        ctx.save();
        
        for (let x = spacing / 2; x < width; x += spacing) {
            for (let y = spacing / 2; y < height; y += spacing) {
                const worldX = x - offsetX;
                const worldY = y - offsetY;
                const E = scene.getElectricField(worldX, worldY);
                const magnitude = Math.sqrt(E.x * E.x + E.y * E.y);
                
                if (magnitude <= 0) continue;

                // 对于小场强也显示箭头（保证可见），长度随场强变化并限制上下限
                const len = Math.min(maxArrowLen, Math.max(minArrowLen, magnitude * arrowScale));
                const dx = (E.x / magnitude) * len;
                const dy = (E.y / magnitude) * len;
                this.drawFieldArrow(ctx, x, y, dx, dy);
            }
        }
        
        ctx.restore();
    }
    
    drawFieldArrow(ctx, x, y, dx, dy) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.5) return;
        
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
    
}
