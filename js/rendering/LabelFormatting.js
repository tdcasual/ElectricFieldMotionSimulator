export function formatMetricNumber(value) {
    if (!Number.isFinite(value)) return '0';
    const abs = Math.abs(value);
    if (abs === 0) return '0';
    if (abs < 0.01 || abs >= 1e5) return value.toExponential(2);
    if (abs < 1) return value.toFixed(3).replace(/\.?0+$/, '');
    if (abs < 10) return value.toFixed(2);
    if (abs < 100) return value.toFixed(1);
    return value.toFixed(0);
}

export function drawTextBadge(ctx, x, y, text) {
    ctx.save();
    ctx.font = '11px monospace';
    const paddingX = 6;
    const paddingY = 4;
    const metrics = ctx.measureText(text);
    const width = Math.ceil(metrics.width) + paddingX * 2;
    const height = 14 + paddingY * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - paddingX, y - 11 - paddingY, width, height);

    ctx.fillStyle = 'white';
    ctx.fillText(text, x, y);
    ctx.restore();
}
