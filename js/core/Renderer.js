/**
 * 渲染引擎 - 管理多层Canvas渲染
 */

import { GridRenderer } from '../rendering/GridRenderer.js';
import { FieldVisualizer } from '../rendering/FieldVisualizer.js';
import { TrajectoryRenderer } from '../rendering/TrajectoryRenderer.js';

export class Renderer {
    constructor() {
        this.bgCanvas = null;
        this.fieldCanvas = null;
        this.particleCanvas = null;
        
        this.bgCtx = null;
        this.fieldCtx = null;
        this.particleCtx = null;
        
        this.width = 0;
        this.height = 0;
        this.dpr = window.devicePixelRatio || 1;
        
        this.gridRenderer = new GridRenderer();
        this.fieldVisualizer = new FieldVisualizer();
        this.trajectoryRenderer = new TrajectoryRenderer();
        
        this.needFieldRedraw = true;
    }
    
    init() {
        // 获取Canvas元素
        this.bgCanvas = document.getElementById('bg-canvas');
        this.fieldCanvas = document.getElementById('field-canvas');
        this.particleCanvas = document.getElementById('particle-canvas');

        if (!this.bgCanvas || !this.fieldCanvas || !this.particleCanvas) {
            console.warn('Renderer: canvas elements not found, init skipped.');
            return;
        }
        
        this.bgCtx = this.bgCanvas.getContext('2d');
        this.fieldCtx = this.fieldCanvas.getContext('2d');
        this.particleCtx = this.particleCanvas.getContext('2d');
        
        // 设置尺寸
        this.resize();
        
        // 开启抗锯齿
        this.bgCtx.imageSmoothingEnabled = true;
        this.fieldCtx.imageSmoothingEnabled = true;
        this.particleCtx.imageSmoothingEnabled = true;
    }
    
    resize() {
        const container = document.getElementById('canvas-container');
        if (!container || !this.bgCanvas || !this.fieldCanvas || !this.particleCanvas) {
            return;
        }
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // 设置Canvas尺寸（考虑DPI）
        [this.bgCanvas, this.fieldCanvas, this.particleCanvas].forEach(canvas => {
            canvas.width = this.width * this.dpr;
            canvas.height = this.height * this.dpr;
            canvas.style.width = this.width + 'px';
            canvas.style.height = this.height + 'px';
            
            const ctx = canvas.getContext('2d');
            ctx.scale(this.dpr, this.dpr);
        });
        
        this.needFieldRedraw = true;
    }
    
    render(scene) {
        if (!this.bgCtx || !this.fieldCtx || !this.particleCtx) return;

        // 渲染背景层（仅在需要时）
        if (this.needFieldRedraw) {
            this.renderBackground(scene);
            this.renderFields(scene);
            this.needFieldRedraw = false;
        }
        
        // 渲染粒子层（每帧）
        this.renderParticles(scene);
    }
    
    renderBackground(scene) {
        this.bgCtx.clearRect(0, 0, this.width, this.height);
        
        // 绘制网格
        if (scene.settings.showGrid) {
            this.gridRenderer.render(this.bgCtx, this.width, this.height, scene.settings.gridSize);
        }
    }
    
    renderFields(scene) {
        this.fieldCtx.clearRect(0, 0, this.width, this.height);
        
        // 绘制电场
        for (const field of scene.electricFields) {
            this.drawElectricField(field, scene);
        }
        
        // 绘制磁场
        for (const field of scene.magneticFields) {
            this.drawMagneticField(field);
        }
        
        // 绘制场强矢量（可选）
        if (scene.settings.showFieldVectors) {
            this.fieldVisualizer.render(this.fieldCtx, scene, this.width, this.height);
        }
    }
    
    drawElectricField(field, scene) {
        this.fieldCtx.save();
        
        // 绘制场边界
        this.fieldCtx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
        this.fieldCtx.lineWidth = 2;
        
        if (field.type === 'electric-field-rect') {
            this.fieldCtx.strokeRect(field.x, field.y, field.width, field.height);
            
            // 填充半透明背景
            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fillRect(field.x, field.y, field.width, field.height);
        } else if (field.type === 'electric-field-circle') {
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(field.x, field.y, field.radius, 0, Math.PI * 2);
            this.fieldCtx.stroke();
            
            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fill();
        } else if (field.type === 'semicircle-electric-field') {
            // 半圆电场 - 绘制半圆
            const angle = field.orientation * Math.PI / 180;
            const startAngle = angle - Math.PI / 2;
            const endAngle = angle + Math.PI / 2;
            
            this.fieldCtx.beginPath();
            this.fieldCtx.arc(field.x, field.y, field.radius, startAngle, endAngle);
            this.fieldCtx.lineTo(field.x, field.y);
            this.fieldCtx.closePath();
            this.fieldCtx.stroke();
            
            this.fieldCtx.fillStyle = 'rgba(255, 200, 0, 0.1)';
            this.fieldCtx.fill();
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
            this.fieldCtx.strokeStyle = field.polarity > 0 ? '#0088ff' : '#ff4444';
            this.fieldCtx.lineWidth = 3;
            
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate1X2, plate1Y2);
            this.fieldCtx.stroke();
            
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate2X1, plate2Y1);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.stroke();
            
            // 绘制连接线（淡色虚线）
            this.fieldCtx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
            this.fieldCtx.lineWidth = 1;
            this.fieldCtx.setLineDash([5, 5]);
            
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate2X1, plate2Y1);
            this.fieldCtx.stroke();
            
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X2, plate1Y2);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.stroke();
            
            this.fieldCtx.setLineDash([]);
            
            // 填充区域（两板之间）
            this.fieldCtx.fillStyle = 'rgba(100, 150, 255, 0.1)';
            this.fieldCtx.beginPath();
            this.fieldCtx.moveTo(plate1X1, plate1Y1);
            this.fieldCtx.lineTo(plate1X2, plate1Y2);
            this.fieldCtx.lineTo(plate2X2, plate2Y2);
            this.fieldCtx.lineTo(plate2X1, plate2Y1);
            this.fieldCtx.closePath();
            this.fieldCtx.fill();
        }
        
        // 绘制选中高亮
        if (field === scene.selectedObject) {
            this.fieldCtx.strokeStyle = '#0e639c';
            this.fieldCtx.lineWidth = 3;
            this.fieldCtx.setLineDash([5, 5]);
            
            if (field.type === 'electric-field-rect') {
                this.fieldCtx.strokeRect(field.x - 5, field.y - 5, field.width + 10, field.height + 10);
            } else if (field.type === 'electric-field-circle') {
                this.fieldCtx.beginPath();
                this.fieldCtx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
                this.fieldCtx.stroke();
            } else if (field.type === 'semicircle-electric-field') {
                this.fieldCtx.beginPath();
                this.fieldCtx.arc(field.x, field.y, field.radius + 5, 0, Math.PI * 2);
                this.fieldCtx.stroke();
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
                
                this.fieldCtx.beginPath();
                this.fieldCtx.moveTo(
                    field.x - cosPlate * halfWidth - cosField * halfDist,
                    field.y - sinPlate * halfWidth - sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x + cosPlate * halfWidth - cosField * halfDist,
                    field.y + sinPlate * halfWidth - sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x + cosPlate * halfWidth + cosField * halfDist,
                    field.y + sinPlate * halfWidth + sinField * halfDist
                );
                this.fieldCtx.lineTo(
                    field.x - cosPlate * halfWidth + cosField * halfDist,
                    field.y - sinPlate * halfWidth + sinField * halfDist
                );
                this.fieldCtx.closePath();
                this.fieldCtx.stroke();
            }
            
            this.fieldCtx.setLineDash([]);
        }
        
        this.fieldCtx.restore();
    }
    
    drawMagneticField(field) {
        this.fieldCtx.save();
        
        // 绘制磁场边界
        this.fieldCtx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
        this.fieldCtx.lineWidth = 2;
        this.fieldCtx.strokeRect(field.x, field.y, field.width, field.height);
        
        // 填充半透明背景
        this.fieldCtx.fillStyle = 'rgba(100, 150, 255, 0.1)';
        this.fieldCtx.fillRect(field.x, field.y, field.width, field.height);
        
        // 绘制磁场符号（点或叉）
        const spacing = 40;
        this.fieldCtx.fillStyle = field.strength > 0 ? 
            'rgba(100, 150, 255, 0.8)' : 'rgba(255, 100, 100, 0.8)';
        
        for (let x = field.x + spacing / 2; x < field.x + field.width; x += spacing) {
            for (let y = field.y + spacing / 2; y < field.y + field.height; y += spacing) {
                if (field.strength > 0) {
                    // 向外（点）
                    this.fieldCtx.beginPath();
                    this.fieldCtx.arc(x, y, 3, 0, Math.PI * 2);
                    this.fieldCtx.fill();
                } else {
                    // 向内（叉）
                    this.fieldCtx.beginPath();
                    this.fieldCtx.moveTo(x - 5, y - 5);
                    this.fieldCtx.lineTo(x + 5, y + 5);
                    this.fieldCtx.moveTo(x + 5, y - 5);
                    this.fieldCtx.lineTo(x - 5, y + 5);
                    this.fieldCtx.stroke();
                }
            }
        }
        
        this.fieldCtx.restore();
    }
    
    renderParticles(scene) {
        this.particleCtx.clearRect(0, 0, this.width, this.height);
        
        for (const particle of scene.particles) {
            // 绘制轨迹
            if (scene.settings.showTrajectories && particle.showTrajectory) {
                this.trajectoryRenderer.render(this.particleCtx, particle);
            }
            
            // 绘制粒子
            this.drawParticle(particle, scene);
            
            // 绘制能量信息
            if (scene.settings.showEnergy && particle.showEnergy) {
                this.drawEnergyInfo(particle);
            }
        }
    }
    
    drawParticle(particle, scene) {
        this.particleCtx.save();
        
        // 粒子主体
        this.particleCtx.beginPath();
        this.particleCtx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
        this.particleCtx.fillStyle = particle.charge > 0 ? '#ff4444' : '#4444ff';
        this.particleCtx.fill();
        
        // 粒子边框
        this.particleCtx.strokeStyle = 'white';
        this.particleCtx.lineWidth = 2;
        this.particleCtx.stroke();
        
        // 绘制速度向量
        const vScale = 0.1;
        this.drawArrow(
            particle.position.x,
            particle.position.y,
            particle.velocity.x * vScale,
            particle.velocity.y * vScale,
            'white',
            2
        );
        
        // 选中高亮
        if (particle === scene.selectedObject) {
            this.particleCtx.strokeStyle = '#0e639c';
            this.particleCtx.lineWidth = 3;
            this.particleCtx.setLineDash([5, 5]);
            this.particleCtx.beginPath();
            this.particleCtx.arc(particle.position.x, particle.position.y, particle.radius + 8, 0, Math.PI * 2);
            this.particleCtx.stroke();
            this.particleCtx.setLineDash([]);
        }
        
        this.particleCtx.restore();
    }
    
    drawArrow(x, y, dx, dy, color = 'white', lineWidth = 2) {
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 5) return;
        
        const angle = Math.atan2(dy, dx);
        const headLen = 8;
        
        this.particleCtx.save();
        this.particleCtx.strokeStyle = color;
        this.particleCtx.fillStyle = color;
        this.particleCtx.lineWidth = lineWidth;
        
        // 箭头线
        this.particleCtx.beginPath();
        this.particleCtx.moveTo(x, y);
        this.particleCtx.lineTo(x + dx, y + dy);
        this.particleCtx.stroke();
        
        // 箭头头部
        this.particleCtx.beginPath();
        this.particleCtx.moveTo(x + dx, y + dy);
        this.particleCtx.lineTo(
            x + dx - headLen * Math.cos(angle - Math.PI / 6),
            y + dy - headLen * Math.sin(angle - Math.PI / 6)
        );
        this.particleCtx.lineTo(
            x + dx - headLen * Math.cos(angle + Math.PI / 6),
            y + dy - headLen * Math.sin(angle + Math.PI / 6)
        );
        this.particleCtx.closePath();
        this.particleCtx.fill();
        
        this.particleCtx.restore();
    }
    
    drawEnergyInfo(particle) {
        const Ek = particle.getKineticEnergy();
        const x = particle.position.x + 15;
        const y = particle.position.y - 15;
        
        this.particleCtx.save();
        this.particleCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.particleCtx.fillRect(x - 5, y - 15, 120, 25);
        
        this.particleCtx.fillStyle = 'white';
        this.particleCtx.font = '11px monospace';
        this.particleCtx.fillText(`Ek: ${(Ek * 1e9).toFixed(2)} nJ`, x, y);
        
        this.particleCtx.restore();
    }
    
    /**
     * 标记需要重绘场层
     */
    invalidateFields() {
        this.needFieldRedraw = true;
        // 立即清空画布，避免清空操作后残留旧内容
        if (this.fieldCtx && this.particleCtx) {
            this.fieldCtx.clearRect(0, 0, this.width, this.height);
            this.particleCtx.clearRect(0, 0, this.width, this.height);
        }
    }
}
