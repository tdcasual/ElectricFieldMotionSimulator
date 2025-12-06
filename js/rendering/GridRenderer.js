/**
 * 网格渲染器
 */

export class GridRenderer {
    render(ctx, width, height, gridSize) {
        ctx.save();
        
        // 根据主题获取网格颜色
        const isDarkTheme = document.body.classList.contains('dark-theme') || 
                           (!document.body.classList.contains('light-theme'));
        ctx.strokeStyle = isDarkTheme ? 'rgba(51, 51, 51, 0.5)' : 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 0.5;
        
        // 绘制垂直线
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // 绘制水平线
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
