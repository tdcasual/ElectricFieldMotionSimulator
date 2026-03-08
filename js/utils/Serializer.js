/**
 * 序列化工具
 */

const MAX_SCENE_OBJECTS = 5000;
const MAX_EMISSION_RATE = 20000;
const MAX_EMISSION_COUNT = 5000;
const MAX_EMISSION_INTERVAL = 60;

const FINITE_NUMBER_FIELDS = [
    'x',
    'y',
    'vx',
    'vy',
    'width',
    'height',
    'radius',
    'length',
    'plateDistance',
    'depth',
    'viewGap',
    'spotSize',
    'lineWidth',
    'particleRadius',
    'emissionSpeed',
    'startTime',
    'speedMin',
    'speedMax',
    'angleMin',
    'angleMax',
    'particleCharge',
    'particleMass'
];

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function readFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
}

export class Serializer {
    /**
     * 保存任意场景数据到localStorage（可包含 UI 扩展字段）
     */
    static saveSceneData(data, name) {
        const validation = Serializer.validateSceneData(data);
        if (!validation.valid) {
            console.error('保存场景失败:', validation.error || '场景数据无效');
            return false;
        }

        try {
            const json = JSON.stringify(data);
            localStorage.setItem(`scene_${name}`, json);
            return true;
        } catch (error) {
            console.error('保存场景失败:', error);
            return false;
        }
    }

    /**
     * 从localStorage加载场景
     */
    static loadScene(name) {
        try {
            const data = localStorage.getItem(`scene_${name}`);
            if (!data) return null;
            const parsed = JSON.parse(data);
            return parsed;
        } catch (error) {
            console.error('加载场景失败:', error);
            return null;
        }
    }

    /**
     * 导出场景为JSON文件
     */
    static exportToFile(scene, filename) {
        const data = scene.serialize();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `scene-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 从JSON文件导入场景
     */
    static importFromFile(file, callback) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                callback(null, data);
            } catch (error) {
                callback(error, null);
            }
        };

        reader.onerror = () => {
            callback(new Error('文件读取失败'), null);
        };

        reader.readAsText(file);
    }

    /**
     * 获取所有保存的场景
     */
    static listScenes() {
        try {
            const scenes = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (typeof key === 'string' && key.startsWith('scene_')) {
                    scenes.push(key.replace('scene_', ''));
                }
            }
            return scenes;
        } catch (error) {
            console.error('获取场景列表失败:', error);
            return [];
        }
    }

    /**
     * 删除场景
     */
    static deleteScene(name) {
        try {
            localStorage.removeItem(`scene_${name}`);
            return true;
        } catch (error) {
            console.error('删除场景失败:', error);
            return false;
        }
    }

    /**
     * 验证场景数据格式
     */
    static validateSceneData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: '数据格式无效' };
        }

        if (typeof data.version !== 'string' || data.version.trim().length === 0) {
            return { valid: false, error: '缺少版本信息' };
        }

        if (!Array.isArray(data.objects)) {
            return { valid: false, error: '对象数据格式无效' };
        }

        if (data.objects.length > MAX_SCENE_OBJECTS) {
            return { valid: false, error: `对象数量超限（最多 ${MAX_SCENE_OBJECTS}）` };
        }

        for (const object of data.objects) {
            if (!object || typeof object !== 'object' || Array.isArray(object)) {
                return { valid: false, error: '对象条目无效' };
            }
            if (typeof object.type !== 'string' || object.type.trim().length === 0) {
                return { valid: false, error: '对象类型无效' };
            }

            for (const key of FINITE_NUMBER_FIELDS) {
                if (!hasOwn(object, key)) continue;
                const value = readFiniteNumber(object[key]);
                if (value === null) continue;
                if (!Number.isFinite(value)) {
                    return { valid: false, error: `对象字段 ${key} 数值无效` };
                }
            }

            if (hasOwn(object, 'emissionRate')) {
                const rate = readFiniteNumber(object.emissionRate);
                if (!Number.isFinite(rate) || rate < 0 || rate > MAX_EMISSION_RATE) {
                    return { valid: false, error: `对象字段 emissionRate 超出范围（0-${MAX_EMISSION_RATE}）` };
                }
            }

            if (hasOwn(object, 'emissionCount')) {
                const count = readFiniteNumber(object.emissionCount);
                if (!Number.isFinite(count) || count < 0 || count > MAX_EMISSION_COUNT) {
                    return { valid: false, error: `对象字段 emissionCount 超出范围（0-${MAX_EMISSION_COUNT}）` };
                }
            }

            if (hasOwn(object, 'emissionInterval')) {
                const interval = readFiniteNumber(object.emissionInterval);
                if (!Number.isFinite(interval) || interval < 0 || interval > MAX_EMISSION_INTERVAL) {
                    return { valid: false, error: `对象字段 emissionInterval 超出范围（0-${MAX_EMISSION_INTERVAL}）` };
                }
            }
        }

        return { valid: true };
    }
}
