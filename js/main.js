/**
 * 主应用入口
 */

import { Scene } from './core/Scene.js';
import { Renderer } from './core/Renderer.js';
import { PhysicsEngine } from './core/PhysicsEngine.js';
import { EventManager } from './core/EventManager.js';
import { DragDropManager } from './interactions/DragDropManager.js';
import { ContextMenu } from './ui/ContextMenu.js';
import { PropertyPanel } from './ui/PropertyPanel.js';
import { Modal } from './ui/Modal.js';
import { Serializer } from './utils/Serializer.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import { ThemeManager } from './utils/ThemeManager.js';
import { Presets } from './presets/Presets.js';

class Application {
    constructor() {
        this.scene = new Scene();
        this.renderer = new Renderer();
        this.physicsEngine = new PhysicsEngine();
        this.eventManager = new EventManager();
        this.dragDropManager = null;
        this.contextMenu = null;
        this.propertyPanel = null;
        this.modal = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.themeManager = new ThemeManager();
        
        this.running = false;
        this.timeStep = 0.016; // 默认16ms (60fps)
        
        this.init();
    }
    
    init() {
        console.log('🚀 电磁场粒子运动模拟器启动中...');
        
        // 初始化渲染器
        this.renderer.init();
        this.syncViewportFromRenderer();
        
        // 初始化UI组件
        this.contextMenu = new ContextMenu(this.scene);
        this.propertyPanel = new PropertyPanel(this.scene);
        this.modal = new Modal();
        
        // 初始化拖拽系统
        this.dragDropManager = new DragDropManager(this.scene, this.renderer);
        
        // 绑定事件
        this.bindEvents();
        
        // 加载默认场景
        this.loadDefaultScene();
        
        // 默认暂停，等待点击开始
        this.scene.isPaused = true;
        const playIcon = document.getElementById('play-icon');
        if (playIcon) playIcon.textContent = '▶';
        this.renderer.render(this.scene);
        this.updateUI();
        
        console.log('✅ 初始化完成');
    }

    syncViewportFromRenderer() {
        const width = this.renderer?.width ?? 0;
        const height = this.renderer?.height ?? 0;
        this.scene.setViewport(width, height);
    }

    handleResize() {
        this.renderer.resize();
        this.syncViewportFromRenderer();
        this.requestRender({ forceRender: true, updateUI: false });
    }

    requestRender(options = {}) {
        const { invalidateFields = false, forceRender = false, updateUI = true } = options;
        if (invalidateFields) {
            this.renderer.invalidateFields();
        }
        if (forceRender || this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
        if (updateUI) {
            this.updateUI();
        }
    }
    
    bindEvents() {
        // 主题切换按钮
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 播放/暂停按钮
        document.getElementById('play-pause-btn').addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        // 重置按钮
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
        
        // 清空按钮
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.clearScene();
        });
        
        // 保存按钮
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveScene();
        });
        
        // 加载按钮
        document.getElementById('load-btn').addEventListener('click', () => {
            this.loadScene();
        });
        
        // 导出按钮
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportScene();
        });
        
        // 导入按钮
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });
        
        // 导入文件选择
        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.importScene(e.target.files[0]);
        });
        
        // 时间步长滑块
        const timestepSlider = document.getElementById('timestep-slider');
        const timestepValue = document.getElementById('timestep-value');
        timestepSlider.addEventListener('input', (e) => {
            this.timeStep = parseFloat(e.target.value);
            timestepValue.textContent = (this.timeStep * 1000).toFixed(0) + 'ms';
        });

        // 能量显示开关
        const energyToggle = document.getElementById('toggle-energy-overlay');
        if (energyToggle) {
            energyToggle.checked = this.scene.settings.showEnergy;
            energyToggle.addEventListener('change', (e) => {
                this.scene.settings.showEnergy = e.target.checked;
                this.requestRender({ updateUI: false });
            });
        }
        
        // 预设场景按钮
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetName = e.target.dataset.preset;
                this.loadPreset(presetName);
            });
        });
        
        // 关闭属性面板
        document.getElementById('close-panel-btn')?.addEventListener('click', () => {
            this.propertyPanel.hide();
        });
        
        // 窗口大小改变
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }
    
    handleKeydown(e) {
        // Space: 播放/暂停
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePlayPause();
        }
        
        // Delete: 删除选中对象
        if (e.code === 'Delete' && this.scene.selectedObject) {
            this.scene.removeObject(this.scene.selectedObject);
            this.scene.selectedObject = null;
            this.propertyPanel.hide();
            this.requestRender({ invalidateFields: true });
        }
        
        // Ctrl+S: 保存
        if (e.ctrlKey && e.code === 'KeyS') {
            e.preventDefault();
            this.saveScene();
        }
        
        // Ctrl+O: 加载
        if (e.ctrlKey && e.code === 'KeyO') {
            e.preventDefault();
            this.loadScene();
        }
        
        // Ctrl+Z: 撤销 (TODO)
        if (e.ctrlKey && e.code === 'KeyZ') {
            e.preventDefault();
            // this.undo();
        }
    }
    
    start() {
        this.running = true;
        this.loop();
    }
    
    stop() {
        this.running = false;
    }
    
    togglePlayPause() {
        this.running = !this.running;
        this.scene.isPaused = !this.running;  // 同步暂停状态到Scene
        const playIcon = document.getElementById('play-icon');
        playIcon.textContent = this.running ? '⏸️' : '▶️';
        
        if (this.running) {
            this.loop();
        }
    }
    
    loop() {
        if (!this.running) return;
        
        // 性能监控
        this.performanceMonitor.startFrame();
        
        // 物理更新
        this.performanceMonitor.startMeasure('physics');
        this.scene.time += this.timeStep;
        this.physicsEngine.update(this.scene, this.timeStep);
        this.performanceMonitor.endMeasure('physics');
        
        // 渲染
        this.performanceMonitor.startMeasure('render');
        this.renderer.render(this.scene);
        this.performanceMonitor.endMeasure('render');
        
        // 更新UI
        this.updateUI();
        
        this.performanceMonitor.endFrame();
        
        // 递归调用
        requestAnimationFrame(() => this.loop());
    }
    
    updateUI() {
        // 更新FPS
        const fpsCounter = document.getElementById('fps-counter');
        fpsCounter.textContent = `FPS: ${this.performanceMonitor.getFPS()}`;
        
        // 更新对象计数
        document.getElementById('object-count').textContent = 
            `对象: ${this.scene.getAllObjects().length}`;
        document.getElementById('particle-count').textContent = 
            `粒子: ${this.scene.particles.length}`;
    }
    
    reset() {
        this.scene.clear();
        this.propertyPanel.hide();
        this.requestRender({ invalidateFields: true });
        this.showNotification('场景已重置', 'info');
    }
    
    clearScene() {
        if (confirm('确定要清空整个场景吗？此操作不可撤销。')) {
            this.scene.clear();
            this.propertyPanel.hide();
            this.requestRender({ invalidateFields: true });
            this.showNotification('场景已清空', 'success');
        }
    }
    
    saveScene() {
        const sceneName = prompt('请输入场景名称:', 'my-scene');
        if (sceneName) {
            Serializer.saveScene(this.scene, sceneName);
            this.showNotification(`场景 "${sceneName}" 已保存`, 'success');
        }
    }
    
    loadScene() {
        const sceneName = prompt('请输入要加载的场景名称:', 'my-scene');
        if (sceneName) {
            try {
                const loadedData = Serializer.loadScene(sceneName);
                if (loadedData) {
                    // 重用现有 scene 实例以保持 UI 组件引用
                    this.scene.clear();
                    this.scene.loadFromData(loadedData);
                    this.propertyPanel.hide();
                    this.requestRender({ invalidateFields: true });
                    this.showNotification(`场景 "${sceneName}" 已加载`, 'success');
                } else {
                    this.showNotification(`场景 "${sceneName}" 不存在`, 'error');
                }
            } catch (error) {
                this.showNotification('加载场景失败: ' + error.message, 'error');
            }
        }
    }
    
    loadDefaultScene() {
        // 加载默认示例场景
        this.showNotification('欢迎使用电磁场粒子运动模拟器！从左侧拖拽组件开始', 'info');
    }
    
    loadPreset(presetName) {
        const preset = Presets.get(presetName);
        if (!preset) return;

        try {
            this.scene.clear();
            this.propertyPanel?.hide?.();
            this.scene.loadFromData(preset.data);
            this.requestRender({ invalidateFields: true });
            this.showNotification(`已加载预设场景: ${preset.name}`, 'success');
        } catch (error) {
            console.error('加载预设失败:', error);
            this.showNotification('加载预设失败: ' + error.message, 'error');
        }
    }
    
    exportScene() {
        try {
            const sceneData = this.scene.serialize();
            const jsonStr = JSON.stringify(sceneData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `electric-field-scene-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showNotification('场景已导出', 'success');
        } catch (error) {
            console.error('导出失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }
    
    importScene(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 验证数据格式
                const validation = Serializer.validateSceneData(data);
                if (!validation.valid) {
                    throw new Error(validation.error);
                }
                
                // 清空当前场景并加载新数据
                this.scene.clear();
                this.scene.loadFromData(data);
                this.propertyPanel.hide();
                this.requestRender({ invalidateFields: true });
                
                const objectCount = (data.electricFields?.length || 0) +
                                   (data.magneticFields?.length || 0) +
                                   (data.emitters?.length || 0) +
                                   (data.screens?.length || 0) +
                                   (data.particles?.length || 0);
                this.showNotification(`场景已导入 (${objectCount}个对象)`, 'success');
            } catch (error) {
                console.error('导入失败:', error);
                this.showNotification('导入失败: ' + error.message, 'error');
            }
            
            // 重置文件输入
            document.getElementById('import-file-input').value = '';
        };
        
        reader.onerror = () => {
            this.showNotification('读取文件失败', 'error');
            document.getElementById('import-file-input').value = '';
        };
        
        reader.readAsText(file);
    }
    
    /**
     * 切换主题（深色/浅色）
     */
    toggleTheme() {
        this.themeManager.toggle();
        this.requestRender({ invalidateFields: true, updateUI: false });
        const currentTheme = this.themeManager.getCurrentTheme();
        this.showNotification(`已切换到${currentTheme === 'dark' ? '深色' : '浅色'}模式`, 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new Application();
});
