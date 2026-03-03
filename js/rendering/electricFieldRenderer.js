import {
    buildUniformElectricGeometry,
    tracePolygonPath
} from './fieldGeometryRenderer.js';
import { buildSelectionHandles } from './fieldSelectionOverlayRenderer.js';

export function drawElectricField(renderer, field, scene) {
    renderer.fieldCtx.save();
    const vertexModeEnabled = scene?.settings?.vertexEditMode === true;
    const isUniformField = field.type === 'electric-field-rect' || field.type === 'electric-field-circle';
    const uniformGeometry = isUniformField ? buildUniformElectricGeometry(field) : null;
    const circleBoundary = uniformGeometry?.circleBoundary ?? null;
    const polygonVertices = uniformGeometry?.polygonVertices ?? [];
    const polygonBounds = uniformGeometry?.polygonBounds ?? null;

    // 绘制场边界
    renderer.fieldCtx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
    renderer.fieldCtx.lineWidth = 2;

    if (isUniformField) {
        if (circleBoundary) {
            renderer.fieldCtx.beginPath();
            renderer.fieldCtx.arc(circleBoundary.x, circleBoundary.y, circleBoundary.radius, 0, Math.PI * 2);
            renderer.fieldCtx.stroke();
            renderer.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            renderer.fieldCtx.fill();
        } else if (tracePolygonPath(renderer.fieldCtx, polygonVertices)) {
            renderer.fieldCtx.stroke();
            renderer.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            renderer.fieldCtx.fill();
        } else {
            renderer.fieldCtx.strokeRect(field.x, field.y, field.width, field.height);

            // 填充半透明背景
            renderer.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            renderer.fieldCtx.fillRect(field.x, field.y, field.width, field.height);
        }
    } else if (field.type === 'semicircle-electric-field') {
        // 半圆电场 - 绘制半圆
        const angle = field.orientation * Math.PI / 180;
        const startAngle = angle - Math.PI / 2;
        const endAngle = angle + Math.PI / 2;

        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.arc(field.x, field.y, field.radius, startAngle, endAngle);
        renderer.fieldCtx.lineTo(field.x, field.y);
        renderer.fieldCtx.closePath();
        renderer.fieldCtx.stroke();

        renderer.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
        renderer.fieldCtx.fill();
    } else if (field.type === 'parallel-plate-capacitor') {
        // 平行板电容器 - 绘制两条平行的板
        // 极板方向（垂直于电场方向）
        const plateAngle = (field.direction + 90) * Math.PI / 180;
        const cosPlate = Math.cos(plateAngle);
        const sinPlate = Math.sin(plateAngle);

        // 电场方向
        const fieldAngle = field.direction * Math.PI / 180;
        const cosField = Math.cos(fieldAngle);
        const sinField = Math.sin(fieldAngle);

        const halfWidth = field.width / 2;
        const halfDist = field.plateDistance / 2;

        // 第一块板（沿负电场方向）
        const plate1X1 = field.x - cosPlate * halfWidth - cosField * halfDist;
        const plate1Y1 = field.y - sinPlate * halfWidth - sinField * halfDist;
        const plate1X2 = field.x + cosPlate * halfWidth - cosField * halfDist;
        const plate1Y2 = field.y + sinPlate * halfWidth - sinField * halfDist;

        // 第二块板（沿正电场方向）
        const plate2X1 = field.x - cosPlate * halfWidth + cosField * halfDist;
        const plate2Y1 = field.y - sinPlate * halfWidth + sinField * halfDist;
        const plate2X2 = field.x + cosPlate * halfWidth + cosField * halfDist;
        const plate2Y2 = field.y + sinPlate * halfWidth + sinField * halfDist;

        // 绘制两块板
        renderer.fieldCtx.strokeStyle = field.polarity > 0 ? '#0088ff' : '#ff4444';
        renderer.fieldCtx.lineWidth = 3;

        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(plate1X1, plate1Y1);
        renderer.fieldCtx.lineTo(plate1X2, plate1Y2);
        renderer.fieldCtx.stroke();

        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(plate2X1, plate2Y1);
        renderer.fieldCtx.lineTo(plate2X2, plate2Y2);
        renderer.fieldCtx.stroke();

        // 绘制连接线（淡色虚线）
        renderer.fieldCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        renderer.fieldCtx.lineWidth = 1;
        renderer.fieldCtx.setLineDash([5, 5]);

        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(plate1X1, plate1Y1);
        renderer.fieldCtx.lineTo(plate2X1, plate2Y1);
        renderer.fieldCtx.stroke();

        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(plate1X2, plate1Y2);
        renderer.fieldCtx.lineTo(plate2X2, plate2Y2);
        renderer.fieldCtx.stroke();

        renderer.fieldCtx.setLineDash([]);

        // 填充区域（两板之间）
        renderer.fieldCtx.fillStyle = 'rgba(100, 150, 255, 0.1)';
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(plate1X1, plate1Y1);
        renderer.fieldCtx.lineTo(plate1X2, plate1Y2);
        renderer.fieldCtx.lineTo(plate2X2, plate2Y2);
        renderer.fieldCtx.lineTo(plate2X1, plate2Y1);
        renderer.fieldCtx.closePath();
        renderer.fieldCtx.fill();
    } else if (field.type === 'vertical-parallel-plate-capacitor') {
        // 垂直平行板电容器：用两条竖线和箭头示意
        const halfHeight = field.height / 2;
        const halfGap = field.plateDistance / 2;
        const xLeft = field.x - halfGap;
        const xRight = field.x + halfGap;
        const yTop = field.y - halfHeight;
        const yBottom = field.y + halfHeight;

        renderer.fieldCtx.strokeStyle = field.polarity > 0 ? '#0088ff' : '#ff4444';
        renderer.fieldCtx.lineWidth = 3;

        // 左板
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(xLeft, yTop);
        renderer.fieldCtx.lineTo(xLeft, yBottom);
        renderer.fieldCtx.stroke();
        // 右板
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(xRight, yTop);
        renderer.fieldCtx.lineTo(xRight, yBottom);
        renderer.fieldCtx.stroke();

        // 箭头示意电场方向（竖直）
        const dir = field.polarity >= 0 ? -1 : 1; // 正向向上
        const arrowX = field.x;
        const arrowTop = field.y + dir * (halfHeight * 0.6);
        const arrowBottom = field.y - dir * (halfHeight * 0.1);
        renderer.fieldCtx.strokeStyle = '#00ccaa';
        renderer.fieldCtx.fillStyle = '#00ccaa';
        renderer.fieldCtx.lineWidth = 2;
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(arrowX, arrowTop);
        renderer.fieldCtx.lineTo(arrowX, arrowBottom);
        renderer.fieldCtx.stroke();

        const angle = dir < 0 ? -Math.PI / 2 : Math.PI / 2;
        const headLen = 8;
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(arrowX, arrowTop);
        renderer.fieldCtx.lineTo(arrowX - headLen * Math.cos(angle - Math.PI / 6), arrowTop - headLen * Math.sin(angle - Math.PI / 6));
        renderer.fieldCtx.lineTo(arrowX - headLen * Math.cos(angle + Math.PI / 6), arrowTop - headLen * Math.sin(angle + Math.PI / 6));
        renderer.fieldCtx.closePath();
        renderer.fieldCtx.fill();
    }

    // 显示场强（便于查看）
    if (isUniformField || field.type === 'semicircle-electric-field') {
        const strength = Number.isFinite(field.strength) ? field.strength : 0;
        let labelX = field.x + 8;
        let labelY = field.y + 18;
        if (isUniformField && polygonBounds) {
            labelX = polygonBounds.minX + 8;
            labelY = polygonBounds.minY + 18;
        } else if (circleBoundary) {
            labelX = circleBoundary.x - circleBoundary.radius + 8;
            labelY = circleBoundary.y - circleBoundary.radius + 18;
        } else if (field.type === 'semicircle-electric-field') {
            const r = Number.isFinite(field.radius) ? field.radius : 0;
            labelX = field.x - r + 8;
            labelY = field.y - r + 18;
        }
        renderer.drawTextBadge(renderer.fieldCtx, labelX, labelY, `E: ${renderer.formatNumber(strength)} N/C`);
    }

    // 绘制选中高亮
    if (field === scene.selectedObject) {
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 3;
        renderer.fieldCtx.setLineDash([5, 5]);

        if (isUniformField) {
            if (circleBoundary) {
                renderer.fieldCtx.beginPath();
                renderer.fieldCtx.arc(circleBoundary.x, circleBoundary.y, circleBoundary.radius + 5, 0, Math.PI * 2);
                renderer.fieldCtx.stroke();
            } else if (tracePolygonPath(renderer.fieldCtx, polygonVertices)) {
                renderer.fieldCtx.stroke();
            } else {
                renderer.fieldCtx.strokeRect(field.x - 5, field.y - 5, field.width + 10, field.height + 10);
            }
        } else if (field.type === 'semicircle-electric-field') {
            renderer.fieldCtx.beginPath();
            renderer.fieldCtx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
            renderer.fieldCtx.stroke();
        } else if (field.type === 'parallel-plate-capacitor') {
            // 绘制电容器的选中边界
            const plateAngle = (field.direction + 90) * Math.PI / 180;
            const cosPlate = Math.cos(plateAngle);
            const sinPlate = Math.sin(plateAngle);

            const fieldAngle = field.direction * Math.PI / 180;
            const cosField = Math.cos(fieldAngle);
            const sinField = Math.sin(fieldAngle);

            const halfWidth = field.width / 2 + 5;
            const halfDist = field.plateDistance / 2 + 5;

            renderer.fieldCtx.beginPath();
            renderer.fieldCtx.moveTo(
                field.x - cosPlate * halfWidth - cosField * halfDist,
                field.y - sinPlate * halfWidth - sinField * halfDist
            );
            renderer.fieldCtx.lineTo(
                field.x + cosPlate * halfWidth - cosField * halfDist,
                field.y + sinPlate * halfWidth - sinField * halfDist
            );
            renderer.fieldCtx.lineTo(
                field.x + cosPlate * halfWidth + cosField * halfDist,
                field.y + sinPlate * halfWidth + sinField * halfDist
            );
            renderer.fieldCtx.lineTo(
                field.x - cosPlate * halfWidth + cosField * halfDist,
                field.y - sinPlate * halfWidth + sinField * halfDist
            );
            renderer.fieldCtx.closePath();
            renderer.fieldCtx.stroke();
        } else if (field.type === 'vertical-parallel-plate-capacitor') {
            const halfHeight = field.height / 2 + 5;
            const halfGap = field.plateDistance / 2 + 5;
            renderer.fieldCtx.strokeRect(field.x - halfGap, field.y - halfHeight, halfGap * 2, halfHeight * 2);
        }

        renderer.fieldCtx.setLineDash([]);

        // 缩放控制点（仅匀强电场）
        if (isUniformField || field.type === 'semicircle-electric-field') {
            const handles = isUniformField
                ? buildSelectionHandles({
                    vertexModeEnabled,
                    circleBoundary,
                    polygonVertices,
                    polygonBounds,
                    fallbackRect: {
                        x: Number.isFinite(field?.x) ? field.x : 0,
                        y: Number.isFinite(field?.y) ? field.y : 0,
                        width: Number.isFinite(field?.width) ? field.width : 0,
                        height: Number.isFinite(field?.height) ? field.height : 0
                    }
                })
                : [{ x: field.x + Math.max(0, field.radius ?? 0), y: field.y }];

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
    }

    renderer.fieldCtx.restore();
}
