import { getGeometryCircleBoundary, getGeometryWorldVertices } from '../geometry/GeometryKernel.js';
import { buildMagneticGeometryPath } from './fieldGeometryRenderer.js';
import { buildSelectionHandles } from './fieldSelectionOverlayRenderer.js';

export function drawMagneticField(renderer, field, scene) {
    renderer.fieldCtx.save();

    const strength = Number.isFinite(field.strength) ? field.strength : 0;
    const hasDirection = Math.abs(strength) > 1e-12;
    const vertexModeEnabled = scene?.settings?.vertexEditMode === true;
    const circleBoundary = getGeometryCircleBoundary(field);
    const polygonVertices = circleBoundary ? [] : getGeometryWorldVertices(field);
    const colorRgb = strength >= 0 ? [100, 150, 255] : [255, 100, 100];
    const borderColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.65)`;
    const fillColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.08)`;
    const symbolColor = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.85)`;

    // 绘制磁场边界与填充
    const bounds = buildMagneticGeometryPath(renderer.fieldCtx, field);
    if (!bounds) {
        renderer.fieldCtx.restore();
        return;
    }
    renderer.fieldCtx.strokeStyle = borderColor;
    renderer.fieldCtx.lineWidth = 2;
    renderer.fieldCtx.stroke();
    renderer.fieldCtx.fillStyle = fillColor;
    renderer.fieldCtx.fill();

    // 绘制几何中心标记，便于对齐
    const center = (() => {
        if (
            Number.isFinite(bounds?.minX) &&
            Number.isFinite(bounds?.maxX) &&
            Number.isFinite(bounds?.minY) &&
            Number.isFinite(bounds?.maxY)
        ) {
            return {
                x: (bounds.minX + bounds.maxX) / 2,
                y: (bounds.minY + bounds.maxY) / 2
            };
        }
        return null;
    })();

    if (center) {
        renderer.fieldCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        renderer.fieldCtx.lineWidth = 1.5;
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(center.x - 7, center.y);
        renderer.fieldCtx.lineTo(center.x + 7, center.y);
        renderer.fieldCtx.moveTo(center.x, center.y - 7);
        renderer.fieldCtx.lineTo(center.x, center.y + 7);
        renderer.fieldCtx.stroke();

        renderer.fieldCtx.fillStyle = 'rgba(20, 30, 48, 0.95)';
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
        renderer.fieldCtx.fill();
    }

    // 绘制磁场符号阵列（· / ×）
    const spacing = 40;
    const dotRadius = 3;
    const crossOffset = 4.5;

    // Clip to shape so symbols won't leak outside circle/triangle.
    buildMagneticGeometryPath(renderer.fieldCtx, field);
    renderer.fieldCtx.save();
    renderer.fieldCtx.clip();

    renderer.fieldCtx.strokeStyle = symbolColor;
    renderer.fieldCtx.fillStyle = symbolColor;
    renderer.fieldCtx.lineWidth = 1.8;

    for (let x = bounds.minX + spacing / 2; x < bounds.maxX; x += spacing) {
        for (let y = bounds.minY + spacing / 2; y < bounds.maxY; y += spacing) {
            if (!hasDirection) continue;

            if (strength > 0) {
                // ·：指向屏幕外
                renderer.fieldCtx.beginPath();
                renderer.fieldCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
                renderer.fieldCtx.fill();
            } else {
                // ×：指向屏幕内
                renderer.fieldCtx.beginPath();
                renderer.fieldCtx.moveTo(x - crossOffset, y - crossOffset);
                renderer.fieldCtx.lineTo(x + crossOffset, y + crossOffset);
                renderer.fieldCtx.moveTo(x + crossOffset, y - crossOffset);
                renderer.fieldCtx.lineTo(x - crossOffset, y + crossOffset);
                renderer.fieldCtx.stroke();
            }
        }
    }

    renderer.fieldCtx.restore();

    // 选中高亮 + 缩放控制点（仅磁场）
    if (scene && field === scene.selectedObject) {
        // 选中边界
        buildMagneticGeometryPath(renderer.fieldCtx, field);
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2.5;
        renderer.fieldCtx.setLineDash([5, 5]);
        renderer.fieldCtx.stroke();
        renderer.fieldCtx.setLineDash([]);

        // 缩放控制点
        const handles = buildSelectionHandles({
            vertexModeEnabled,
            circleBoundary,
            polygonVertices,
            polygonBounds: bounds,
            fallbackRect: {
                x: Number.isFinite(field?.x) ? field.x : 0,
                y: Number.isFinite(field?.y) ? field.y : 0,
                width: Number.isFinite(field?.width) ? field.width : 0,
                height: Number.isFinite(field?.height) ? field.height : 0
            }
        });

        const size = 10;
        renderer.fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2;
        for (const handle of handles) {
            renderer.fieldCtx.beginPath();
            renderer.fieldCtx.rect(handle.x - size / 2, handle.y - size / 2, size, size);
            renderer.fieldCtx.fill();
            renderer.fieldCtx.stroke();
        }
    }

    // 显示场强（便于查看）
    const bVal = Number.isFinite(field.strength) ? field.strength : 0;
    renderer.drawTextBadge(renderer.fieldCtx, bounds.minX + 8, bounds.minY + 18, `B: ${renderer.formatNumber(bVal)} T`);

    renderer.fieldCtx.restore();
}
