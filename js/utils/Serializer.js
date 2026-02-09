/**
 * 序列化工具
 */

export class Serializer {
    /**
     * 保存场景到localStorage
     */
    static saveScene(scene, name) {
        return Serializer.saveSceneData(scene.serialize(), name);
    }

    /**
     * 保存任意场景数据到localStorage（可包含 UI 扩展字段）
     */
    static saveSceneData(data, name) {
        const json = JSON.stringify(data);
        localStorage.setItem(`scene_${name}`, json);
    }
    
    /**
     * 从localStorage加载场景
     */
    static loadScene(name) {
        const data = localStorage.getItem(`scene_${name}`);
        if (!data) return null;
        
        try {
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
        const scenes = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('scene_')) {
                scenes.push(key.replace('scene_', ''));
            }
        }
        return scenes;
    }
    
    /**
     * 删除场景
     */
    static deleteScene(name) {
        localStorage.removeItem(`scene_${name}`);
    }
    
    /**
     * 验证场景数据格式
     */
    static validateSceneData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: '数据格式无效' };
        }
        
        if (!data.version) {
            return { valid: false, error: '缺少版本信息' };
        }

        if (data.objects == null) {
            data.objects = [];
            return { valid: true };
        }

        if (!Array.isArray(data.objects)) {
            return { valid: false, error: '对象数据格式无效' };
        }
        
        return { valid: true };
    }
}
