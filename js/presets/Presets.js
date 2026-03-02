/**
 * 预设场景配置
 */

function buildRectGeometry(width, height) {
    return {
        kind: 'polygon',
        vertices: [
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: width, y: height },
            { x: 0, y: height }
        ]
    };
}

export class Presets {
    static presets = {
        'uniform-acceleration': {
            name: '匀加速运动',
            description: '带电粒子在匀强电场中的匀加速直线运动',
            data: {
                version: '2.0',
                objects: [
                    {
                        type: 'electric-field-rect',
                        x: 100,
                        y: 100,
                        width: 600,
                        height: 400,
                        geometry: buildRectGeometry(600, 400),
                        strength: 1000,
                        direction: 90
                    },
                    {
                        type: 'particle',
                        x: 400,
                        y: 150,
                        vx: 0,
                        vy: 0,
                        mass: 9.109e-31,
                        charge: -1.602e-19,
                        ignoreGravity: true
                    }
                ]
            }
        },
        
        'cyclotron': {
            name: '回旋运动',
            description: '带电粒子在磁场中的圆周运动',
            data: {
                version: '2.0',
                objects: [
                    {
                        type: 'magnetic-field',
                        x: 200,
                        y: 150,
                        width: 400,
                        height: 300,
                        geometry: buildRectGeometry(400, 300),
                        strength: 0.5
                    },
                    {
                        type: 'particle',
                        x: 400,
                        y: 300,
                        vx: 100000,
                        vy: 0,
                        mass: 9.109e-31,
                        charge: -1.602e-19,
                        ignoreGravity: true
                    }
                ]
            }
        },
        
        'capacitor-deflection': {
            name: '电容器偏转',
            description: '带电粒子在平行板电容器中的偏转运动',
            data: {
                version: '2.0',
                objects: [
                    {
                        type: 'electric-field-rect',
                        x: 300,
                        y: 200,
                        width: 400,
                        height: 200,
                        geometry: buildRectGeometry(400, 200),
                        strength: 2000,
                        direction: 90
                    },
                    {
                        type: 'particle',
                        x: 200,
                        y: 300,
                        vx: 200,
                        vy: 0,
                        mass: 9.109e-31,
                        charge: -1.602e-19,
                        ignoreGravity: true
                    }
                ]
            }
        }
    };
    
    static get(name) {
        return this.presets[name];
    }
    
    static getAll() {
        return Object.keys(this.presets).map(key => ({
            key,
            ...this.presets[key]
        }));
    }
}
