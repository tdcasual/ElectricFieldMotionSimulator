export function drawDisappearZone(renderer, zone, scene) {
    renderer.fieldCtx.save();

    const isDarkTheme = document.body.classList.contains('dark-theme') ||
        (!document.body.classList.contains('light-theme'));
    const color = isDarkTheme ? 'rgba(255, 120, 120, 0.9)' : 'rgba(220, 60, 60, 0.9)';

    const length = Number.isFinite(zone.length) ? zone.length : 0;
    const lineWidth = Number.isFinite(zone.lineWidth) ? zone.lineWidth : 6;
    const angle = (Number.isFinite(zone.angle) ? zone.angle : 0) * Math.PI / 180;

    renderer.fieldCtx.translate(zone.x, zone.y);
    renderer.fieldCtx.rotate(angle);

    renderer.fieldCtx.strokeStyle = color;
    renderer.fieldCtx.lineWidth = lineWidth;
    renderer.fieldCtx.lineCap = 'round';
    renderer.fieldCtx.setLineDash([12, 8]);
    renderer.fieldCtx.beginPath();
    renderer.fieldCtx.moveTo(-length / 2, 0);
    renderer.fieldCtx.lineTo(length / 2, 0);
    renderer.fieldCtx.stroke();
    renderer.fieldCtx.setLineDash([]);

    // 选中高亮
    if (scene && zone === scene.selectedObject) {
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2;
        renderer.fieldCtx.setLineDash([5, 5]);
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.moveTo(-length / 2, 0);
        renderer.fieldCtx.lineTo(length / 2, 0);
        renderer.fieldCtx.stroke();
        renderer.fieldCtx.setLineDash([]);

        // 端点提示
        const size = 10;
        renderer.fieldCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2;
        for (const x of [-length / 2, length / 2]) {
            renderer.fieldCtx.beginPath();
            renderer.fieldCtx.rect(x - size / 2, -size / 2, size, size);
            renderer.fieldCtx.fill();
            renderer.fieldCtx.stroke();
        }
    }

    renderer.fieldCtx.restore();
}

export function drawElectronGun(renderer, emitter, scene) {
    const originX = Number.isFinite(emitter?.x) ? emitter.x : 0;
    const originY = Number.isFinite(emitter?.y) ? emitter.y : 0;

    // 点状发射器：中心点即发射原点
    renderer.fieldCtx.save();
    renderer.fieldCtx.fillStyle = '#6c9bf4';
    renderer.fieldCtx.strokeStyle = '#2c5aa0';
    renderer.fieldCtx.lineWidth = 2;
    renderer.fieldCtx.beginPath();
    renderer.fieldCtx.arc(originX, originY, 6, 0, Math.PI * 2);
    renderer.fieldCtx.fill();
    renderer.fieldCtx.stroke();

    renderer.fieldCtx.fillStyle = '#ffffff';
    renderer.fieldCtx.beginPath();
    renderer.fieldCtx.arc(originX, originY, 2, 0, Math.PI * 2);
    renderer.fieldCtx.fill();
    renderer.fieldCtx.restore();

    // 叠加显示（速度/能量）
    if (emitter.showVelocity || emitter.showEnergy) {
        const pixelsPerMeter = Number.isFinite(scene?.settings?.pixelsPerMeter) && scene.settings.pixelsPerMeter > 0
            ? scene.settings.pixelsPerMeter
            : 1;
        const angle = emitter.direction * Math.PI / 180;

        if (emitter.showVelocity) {
            if (emitter.velocityDisplayMode === 'speed') {
                const speed = (Number.isFinite(emitter.emissionSpeed) ? emitter.emissionSpeed : 0) / pixelsPerMeter;
                renderer.drawTextBadge(
                    renderer.fieldCtx,
                    emitter.x + 18,
                    emitter.y - 18,
                    `v0: ${renderer.formatNumber(speed)} m/s`
                );
            } else {
                const vScale = 0.08;
                let dx = Math.cos(angle) * emitter.emissionSpeed * vScale;
                let dy = Math.sin(angle) * emitter.emissionSpeed * vScale;
                if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
                    dx = 0;
                    dy = 0;
                }
                const len = Math.hypot(dx, dy);
                const maxLen = 140;
                if (len > maxLen && len > 0) {
                    const s = maxLen / len;
                    dx *= s;
                    dy *= s;
                }
                if (Number.isFinite(len) && len > 0) {
                    renderer.drawArrow(renderer.fieldCtx, originX, originY, dx, dy, '#ffffff', 2);
                }
            }
        }

        if (emitter.showEnergy) {
            const speed = (Number.isFinite(emitter.emissionSpeed) ? emitter.emissionSpeed : 0) / pixelsPerMeter;
            const mass = Number.isFinite(emitter.particleMass) ? emitter.particleMass : 0;
            const Ek = 0.5 * mass * speed * speed;
            renderer.drawTextBadge(
                renderer.fieldCtx,
                emitter.x + 18,
                emitter.y - 2,
                `Ek0: ${renderer.formatNumber(Ek * 1e9)} nJ`
            );
        }
    }

    // 选中高亮
    if (emitter === scene.selectedObject) {
        renderer.fieldCtx.save();
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2.5;
        renderer.fieldCtx.setLineDash([5, 5]);
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.arc(originX, originY, 14, 0, Math.PI * 2);
        renderer.fieldCtx.stroke();
        renderer.fieldCtx.restore();
    }
}

export function drawProgrammableEmitter(renderer, emitter, scene) {
    const originX = Number.isFinite(emitter?.x) ? emitter.x : 0;
    const originY = Number.isFinite(emitter?.y) ? emitter.y : 0;

    // 点状发射器：中心点即发射原点
    renderer.fieldCtx.save();
    renderer.fieldCtx.fillStyle = '#7bd389';
    renderer.fieldCtx.strokeStyle = '#2e7d32';
    renderer.fieldCtx.lineWidth = 2;
    renderer.fieldCtx.beginPath();
    renderer.fieldCtx.arc(originX, originY, 6, 0, Math.PI * 2);
    renderer.fieldCtx.fill();
    renderer.fieldCtx.stroke();

    renderer.fieldCtx.fillStyle = '#ffffff';
    renderer.fieldCtx.beginPath();
    renderer.fieldCtx.arc(originX, originY, 2, 0, Math.PI * 2);
    renderer.fieldCtx.fill();
    renderer.fieldCtx.restore();

    // 选中高亮
    if (emitter === scene.selectedObject) {
        renderer.fieldCtx.save();
        renderer.fieldCtx.strokeStyle = '#0e639c';
        renderer.fieldCtx.lineWidth = 2.5;
        renderer.fieldCtx.setLineDash([5, 5]);
        renderer.fieldCtx.beginPath();
        renderer.fieldCtx.arc(originX, originY, 14, 0, Math.PI * 2);
        renderer.fieldCtx.stroke();
        renderer.fieldCtx.restore();
    }
}
