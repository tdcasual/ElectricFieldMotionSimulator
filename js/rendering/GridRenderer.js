/**
 * 网格渲染器
 */

export class GridRenderer {
    render(ctx, width, height, gridSize, offsetX = 0, offsetY = 0) {
        ctx.save();

        const step = Number.isFinite(gridSize) && gridSize > 0 ? gridSize : 50;
        const majorStep = step * 5;
        const normalizeOffset = (offset, size) => ((offset % size) + size) % size;
        const minorOffsetX = normalizeOffset(offsetX, step);
        const minorOffsetY = normalizeOffset(offsetY, step);
        const majorOffsetX = normalizeOffset(offsetX, majorStep);
        const majorOffsetY = normalizeOffset(offsetY, majorStep);

        const bodyClassList = typeof document !== 'undefined' ? document.body?.classList : null;
        const isDarkTheme = bodyClassList
            ? bodyClassList.contains('dark-theme') || !bodyClassList.contains('light-theme')
            : true;
        const palette = isDarkTheme
            ? {
                minor: 'rgba(72, 78, 92, 0.58)',
                major: 'rgba(110, 122, 145, 0.75)',
                axis: 'rgba(175, 205, 255, 0.9)'
            }
            : {
                minor: 'rgba(165, 174, 190, 0.62)',
                major: 'rgba(120, 136, 166, 0.8)',
                axis: 'rgba(45, 95, 180, 0.9)'
            };

        // 次网格：提供基础定位
        ctx.strokeStyle = palette.minor;
        ctx.lineWidth = 0.7;
        for (let x = minorOffsetX; x <= width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = minorOffsetY; y <= height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 主网格：每 5 格强调一次，提升空间参照感
        ctx.strokeStyle = palette.major;
        ctx.lineWidth = 1.1;
        for (let x = majorOffsetX; x <= width; x += majorStep) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = majorOffsetY; y <= height; y += majorStep) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 世界原点轴线（可见时）
        const axisX = Number.isFinite(offsetX) ? offsetX : null;
        if (axisX !== null && axisX >= 0 && axisX <= width) {
            ctx.strokeStyle = palette.axis;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(axisX, 0);
            ctx.lineTo(axisX, height);
            ctx.stroke();
        }

        const axisY = Number.isFinite(offsetY) ? offsetY : null;
        if (axisY !== null && axisY >= 0 && axisY <= height) {
            ctx.strokeStyle = palette.axis;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(0, axisY);
            ctx.lineTo(width, axisY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
