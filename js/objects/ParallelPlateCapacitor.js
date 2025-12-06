/**
 * 平行板电容器对象
 */

import { ElectricField } from './ElectricField.js';
import { Vector } from '../physics/VectorMath.js';

export class ParallelPlateCapacitor extends ElectricField {
    constructor(config = {}) {
        super(config);
        
        this.type = 'parallel-plate-capacitor';
        this.width = config.width || 200;           // 极板长度（沿极板方向）
        this.plateDistance = config.plateDistance || 80; // 两板间距（垂直于极板）
        this.polarity = config.polarity || 1;       // 1 = 正常方向, -1 = 反向
    }
    
    /**
     * 获取点处的电场强度
     * 电容器产生垂直于极板的均匀电场
     */
    getFieldAt(x, y) {
        // 检查是否在电容器区域内（两板之间）
        if (!this.containsPoint(x, y)) {
            return new Vector(0, 0, 0);
        }
        
        // 电场方向垂直于极板方向
        // direction是电场方向（0度=向右，90度=向上）
        const angle = this.direction * Math.PI / 180;
        const Ex = this.strength * Math.cos(angle) * this.polarity;
        const Ey = this.strength * Math.sin(angle) * this.polarity;
        
        return new Vector(Ex, Ey, 0);
    }
    
    /**
     * 检查点是否在电容器区域内（两板之间的矩形区域）
     */
    containsPoint(x, y) {
        // 将点转换到以电容器中心为原点、极板方向为x轴的坐标系
        const dx = x - this.x;
        const dy = y - this.y;
        
        // 极板方向（垂直于电场方向）
        const plateAngle = (this.direction + 90) * Math.PI / 180;
        const cosPlate = Math.cos(plateAngle);
        const sinPlate = Math.sin(plateAngle);
        
        // 电场方向（垂直于极板）
        const fieldAngle = this.direction * Math.PI / 180;
        const cosField = Math.cos(fieldAngle);
        const sinField = Math.sin(fieldAngle);
        
        // 计算在极板方向和电场方向上的投影
        const alongPlate = dx * cosPlate + dy * sinPlate;  // 沿极板方向的距离
        const alongField = dx * cosField + dy * sinField;  // 沿电场方向的距离
        
        // 检查是否在极板长度范围内
        if (Math.abs(alongPlate) > this.width / 2) {
            return false;
        }
        
        // 检查是否在两板之间
        if (Math.abs(alongField) > this.plateDistance / 2) {
            return false;
        }
        
        return true;
    }
    
    /**
     * 绘制电容器的边界（用于调试）
     */
    drawBoundary(ctx) {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        // 极板方向（垂直于电场方向）
        const plateAngle = (this.direction + 90) * Math.PI / 180;
        const cosPlate = Math.cos(plateAngle);
        const sinPlate = Math.sin(plateAngle);
        
        // 电场方向
        const fieldAngle = this.direction * Math.PI / 180;
        const cosField = Math.cos(fieldAngle);
        const sinField = Math.sin(fieldAngle);
        
        const halfWidth = this.width / 2;
        const halfDist = this.plateDistance / 2;
        
        // 绘制矩形边界
        const corners = [
            {
                x: this.x - cosPlate * halfWidth - cosField * halfDist,
                y: this.y - sinPlate * halfWidth - sinField * halfDist
            },
            {
                x: this.x + cosPlate * halfWidth - cosField * halfDist,
                y: this.y + sinPlate * halfWidth - sinField * halfDist
            },
            {
                x: this.x + cosPlate * halfWidth + cosField * halfDist,
                y: this.y + sinPlate * halfWidth + sinField * halfDist
            },
            {
                x: this.x - cosPlate * halfWidth + cosField * halfDist,
                y: this.y - sinPlate * halfWidth + sinField * halfDist
            }
        ];
        
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * 序列化对象
     */
    serialize() {
        return {
            ...super.serialize(),
            width: this.width,
            plateDistance: this.plateDistance,
            polarity: this.polarity,
            color: this.color
        };
    }
    
    /**
     * 反序列化对象
     */
    deserialize(data) {
        super.deserialize(data);
        this.width = data.width;
        this.plateDistance = data.plateDistance;
        this.strength = data.strength;
        this.direction = data.direction;
        this.polarity = data.polarity;
        this.color = data.color;
    }
}
