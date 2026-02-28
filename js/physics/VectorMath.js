/**
 * 向量数学库
 */

export class Vector {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    /**
     * 向量加法
     */
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y, this.z + v.z);
    }
    
    /**
     * 标量乘法
     */
    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
    }
    
    /**
     * 标量除法
     */
    divide(scalar) {
        if (scalar === 0) return new Vector(0, 0, 0);
        return new Vector(this.x / scalar, this.y / scalar, this.z / scalar);
    }
    
    /**
     * 点积
     */
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    
    /**
     * 叉积（向量积）
     */
    cross(v) {
        return new Vector(
            this.y * v.z - this.z * v.y,
            this.z * v.x - this.x * v.z,
            this.x * v.y - this.y * v.x
        );
    }
    
    /**
     * 向量模长
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    /**
     * 归一化（单位向量）
     */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector(0, 0, 0);
        return this.divide(mag);
    }
    
    /**
     * 设置向量模长
     */
    setMagnitude(newMag) {
        return this.normalize().multiply(newMag);
    }
    
    /**
     * 向量方向角（弧度）
     */
    heading() {
        return Math.atan2(this.y, this.x);
    }
    
    /**
     * 向量旋转
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos,
            this.z
        );
    }
    
    /**
     * 复制向量
     */
    clone() {
        return new Vector(this.x, this.y, this.z);
    }
    
    /**
     * 转换为数组
     */
    toArray() {
        return [this.x, this.y, this.z];
    }
    
    /**
     * 转换为字符串
     */
    toString() {
        return `Vector(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
    }
    
    /**
     * 静态方法：从数组创建
     */
    static fromArray(arr) {
        return new Vector(arr[0] || 0, arr[1] || 0, arr[2] || 0);
    }
    
    /**
     * 静态方法：随机单位向量
     */
    static random2D() {
        const angle = Math.random() * Math.PI * 2;
        return new Vector(Math.cos(angle), Math.sin(angle), 0);
    }
    
    /**
     * 静态方法：零向量
     */
    static zero() {
        return new Vector(0, 0, 0);
    }
    
    /**
     * 静态方法：从角度创建单位向量
     */
    static fromAngle(angle) {
        return new Vector(Math.cos(angle), Math.sin(angle), 0);
    }
    
    /**
     * 静态方法：两点间距离
     */
    static distance(v1, v2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const dz = v2.z - v1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    /**
     * 静态方法：线性插值
     */
    static lerp(v1, v2, t) {
        return new Vector(
            v1.x + (v2.x - v1.x) * t,
            v1.y + (v2.y - v1.y) * t,
            v1.z + (v2.z - v1.z) * t
        );
    }
}
