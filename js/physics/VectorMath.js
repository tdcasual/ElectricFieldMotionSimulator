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
     * 向量模长
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
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
     * 静态方法：从数组创建
     */
    static fromArray(arr) {
        return new Vector(arr[0] || 0, arr[1] || 0, arr[2] || 0);
    }
    
    /**
     * 静态方法：零向量
     */
    static zero() {
        return new Vector(0, 0, 0);
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
