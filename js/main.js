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
import { MarkdownBoard } from './ui/MarkdownBoard.js';
import { VariableEditor } from './ui/VariableEditor.js';
import { Modal } from './ui/Modal.js';
import { Toolbar } from './ui/Toolbar.js';
import { Serializer } from './utils/Serializer.js';
import { compileSafeExpression } from './utils/SafeExpression.js';
import { createResetBaselineController } from './utils/ResetBaseline.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import { ThemeManager } from './utils/ThemeManager.js';
import { Presets } from './presets/Presets.js';
import { registry } from './core/registerObjects.js';
import {
    DEMO_BASE_PIXELS_PER_UNIT,
    DEMO_MAX_ZOOM,
    DEMO_MIN_ZOOM,
    DEMO_ZOOM_STEP,
    applyDemoZoomToScene,
    getNextDemoZoom
} from './modes/DemoMode.js';

class Application {
    constructor() {
        this.scene = new Scene();
        this.renderer = new Renderer();
        this.physicsEngine = new PhysicsEngine();
        this.eventManager = new EventManager();
        this.dragDropManager = null;
        this.contextMenu = null;
        this.propertyPanel = null;
        this.markdownBoard = null;
        this.variableEditor = null;
        this.modal = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.themeManager = new ThemeManager();
        this.mode = 'demo';
        this.demoSession = null;
        this.modeSwitchInProgress = false;
        this.demoState = {
            zoom: 1,
            basePixelsPerMeter: DEMO_BASE_PIXELS_PER_UNIT,
            minZoom: DEMO_MIN_ZOOM,
            maxZoom: DEMO_MAX_ZOOM,
            step: DEMO_ZOOM_STEP
        };
        this.resetBaseline = createResetBaselineController();
        this.isRestoringBaseline = false;
        
        this.running = false;
        this.timeStep = 0.016; // 默认16ms (60fps)
        this.scene.settings.mode = this.mode;
        
        this.init();
    }

    buildSceneData() {
        const data = this.scene.serialize();
        const markdownState = this.markdownBoard?.getSceneState?.();
        if (markdownState) {
            data.ui = { ...(data.ui || {}), markdownBoard: markdownState };
        }
        return data;
    }

    applyUIFromSceneData(data) {
        const markdownState = data?.ui?.markdownBoard;
        if (markdownState) {
            this.markdownBoard?.applySceneState?.(markdownState);
        }
    }

    isDemoMode() {
        return this.mode === 'demo';
    }

    getDemoPixelsPerMeter() {
        return this.demoState.basePixelsPerMeter * this.demoState.zoom;
    }

    setRunningState(nextRunning) {
        const running = !!nextRunning;
        this.running = running;
        this.scene.isPaused = !running;
        const playIcon = document.getElementById('play-icon');
        const playLabel = document.getElementById('play-label');
        if (playIcon) {
            playIcon.textContent = running ? '⏸' : '▶';
        }
        if (playLabel) {
            playLabel.textContent = running ? '暂停' : '播放';
        }
        if (running) {
            this.loop();
        }
    }

    captureSceneSnapshot() {
        return JSON.parse(JSON.stringify(this.buildSceneData()));
    }

    shouldTrackResetBaseline() {
        if (this.isRestoringBaseline) return false;
        if (this.running) return false;
        return !!this.scene;
    }

    recordResetBaseline(reason = '') {
        if (!this.shouldTrackResetBaseline()) return false;
        const snapshot = this.captureSceneSnapshot();
        const saved = this.resetBaseline.setBaseline(snapshot);
        if (!saved) return false;
        return true;
    }

    restoreResetBaseline() {
        const snapshot = this.resetBaseline.restoreBaseline();
        if (!snapshot) return false;

        this.isRestoringBaseline = true;
        try {
            this.setRunningState(false);
            this.scene.clear();
            this.scene.loadFromData(snapshot);
            this.applyUIFromSceneData(snapshot);
            this.syncModeToSceneSettings();
            this.propertyPanel?.hide?.();
            this.requestRender({ invalidateFields: true, forceRender: true });
            this.resetBaseline.setBaseline(snapshot);
        } finally {
            this.isRestoringBaseline = false;
        }

        return true;
    }

    restoreSceneSnapshot(snapshot) {
        if (!snapshot || typeof snapshot !== 'object') return;
        this.scene.clear();
        this.scene.loadFromData(snapshot);
        this.applyUIFromSceneData(snapshot);
        this.propertyPanel?.hide?.();
    }

    syncModeToSceneSettings() {
        if (!this.scene?.settings) return;
        this.scene.settings.mode = this.mode;
        if (!this.isDemoMode()) return;
        this.scene.settings.gravity = 0;
        this.scene.settings.pixelsPerMeter = this.getDemoPixelsPerMeter();
    }

    syncDemoButtonState() {
        const demoBtn = document.getElementById('demo-mode-btn');
        if (!demoBtn) return;
        const active = this.isDemoMode();
        demoBtn.classList.toggle('btn-primary', active);
        demoBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        demoBtn.title = active ? '退出演示模式' : '进入演示模式';
        demoBtn.textContent = active ? '退出演示' : '演示模式';
    }

    showModeSwitchPrompt(targetMode) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (choice) => {
                if (settled) return;
                settled = true;
                resolve(choice);
            };

            const enteringDemo = targetMode === 'demo';
            this.modal.showActions({
                title: enteringDemo ? '进入演示模式' : '退出演示模式',
                content: enteringDemo
                    ? '<p>切换前是否保存当前场景？进入演示模式后会清空当前画布并使用临时会话。</p>'
                    : '<p>切换前是否保存当前演示场景？退出后将恢复进入演示模式前的场景。</p>',
                actions: [
                    {
                        label: '保存并切换',
                        className: 'btn btn-primary',
                        onClick: () => finish('save')
                    },
                    {
                        label: '不保存直接切换',
                        className: 'btn',
                        onClick: () => finish('discard')
                    },
                    {
                        label: '取消',
                        className: 'btn',
                        onClick: () => finish('cancel')
                    }
                ],
                onDismiss: () => finish('cancel')
            });
        });
    }

    async toggleDemoMode() {
        if (this.modeSwitchInProgress) return;
        this.modeSwitchInProgress = true;

        try {
            const targetMode = this.isDemoMode() ? 'normal' : 'demo';
            const choice = await this.showModeSwitchPrompt(targetMode);
            if (choice === 'cancel') return;

            if (choice === 'save') {
                const saved = this.saveScene();
                if (!saved) return;
            }

            if (targetMode === 'demo') {
                this.enterDemoMode();
            } else {
                this.exitDemoMode();
            }
        } finally {
            this.modeSwitchInProgress = false;
        }
    }

    enterDemoMode(options = {}) {
        const silent = options?.silent === true;
        this.demoSession = {
            snapshot: this.captureSceneSnapshot(),
            wasRunning: this.running
        };
        this.setRunningState(false);

        this.mode = 'demo';
        this.demoState.zoom = 1;
        this.scene.clear();
        this.scene.settings.boundaryMargin = this.demoState.basePixelsPerMeter;
        this.syncModeToSceneSettings();
        this.propertyPanel?.hide?.();
        this.requestRender({ invalidateFields: true, forceRender: true });
        if (!silent) {
            this.showNotification('已进入演示模式：默认值为 1，滚轮可按鼠标位置缩放', 'info');
        }
    }

    exitDemoMode() {
        const session = this.demoSession;
        this.setRunningState(false);
        this.mode = 'normal';
        this.demoState.zoom = 1;
        if (session?.snapshot) {
            this.restoreSceneSnapshot(session.snapshot);
        }
        this.scene.settings.mode = 'normal';
        this.demoSession = null;
        this.setRunningState(!!session?.wasRunning);
        this.requestRender({ invalidateFields: true, forceRender: true });
        this.showNotification('已退出演示模式并恢复切换前场景', 'success');
    }

    handleDemoWheel(event) {
        if (!this.isDemoMode()) return;
        event.preventDefault();

        const canvas = this.renderer?.particleCanvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const anchorScreenX = event.clientX - rect.left;
        const anchorScreenY = event.clientY - rect.top;
        const anchor = this.scene.toWorldPoint(anchorScreenX, anchorScreenY);

        const nextZoom = getNextDemoZoom(this.demoState.zoom, event.deltaY, {
            step: this.demoState.step,
            min: this.demoState.minZoom,
            max: this.demoState.maxZoom
        });

        if (Math.abs(nextZoom - this.demoState.zoom) < 1e-12) return;

        const changed = applyDemoZoomToScene(this.scene, {
            newPixelsPerMeter: this.demoState.basePixelsPerMeter * nextZoom,
            anchorX: anchor.x,
            anchorY: anchor.y
        });
        if (!changed) return;

        this.demoState.zoom = nextZoom;
        this.scene.settings.gravity = 0;
        this.requestRender({ invalidateFields: true, forceRender: true });
    }

    syncHeaderControlsFromScene() {
        const demoActive = this.isDemoMode();
        const energyToggle = document.getElementById('toggle-energy-overlay');
        if (energyToggle && document.activeElement !== energyToggle) {
            energyToggle.checked = !!this.scene.settings.showEnergy;
        }

        const scaleInput = document.getElementById('scale-px-per-meter');
        if (scaleInput && document.activeElement !== scaleInput) {
            scaleInput.value = String(this.scene.settings.pixelsPerMeter ?? 1);
        }
        if (scaleInput) {
            scaleInput.disabled = demoActive;
        }

        const gravityInput = document.getElementById('gravity-input');
        if (gravityInput && document.activeElement !== gravityInput) {
            gravityInput.value = String(this.scene.settings.gravity ?? 10);
        }
        if (gravityInput) {
            gravityInput.disabled = demoActive;
        }

        const boundarySelect = document.getElementById('boundary-mode-select');
        if (boundarySelect && document.activeElement !== boundarySelect) {
            boundarySelect.value = this.scene.settings.boundaryMode ?? 'margin';
        }

        const boundaryMarginInput = document.getElementById('boundary-margin-input');
        if (boundaryMarginInput && document.activeElement !== boundaryMarginInput) {
            boundaryMarginInput.value = String(this.scene.settings.boundaryMargin ?? 200);
        }

        const boundaryMarginControl = document.getElementById('boundary-margin-control');
        if (boundaryMarginControl && boundarySelect) {
            boundaryMarginControl.style.display = boundarySelect.value === 'margin' ? '' : 'none';
        }

        this.syncDemoButtonState();
    }
    
    init() {
        console.log('🚀 电磁场粒子运动模拟器启动中...');
        
        // 初始化渲染器
        this.renderer.init();
        this.syncViewportFromRenderer();
        
        // 初始化UI组件
        this.toolbar = new Toolbar();
        this.contextMenu = new ContextMenu(this.scene);
        this.propertyPanel = new PropertyPanel(this.scene);
        this.markdownBoard = new MarkdownBoard();
        this.modal = new Modal();
        this.variableEditor = new VariableEditor(this.scene, this.modal);
        
        // 初始化拖拽系统
        this.dragDropManager = new DragDropManager(this.scene, this.renderer);
        
        // 绑定事件
        this.bindEvents();
        
        // 加载默认场景
        this.loadDefaultScene();
        if (this.isDemoMode()) {
            this.enterDemoMode({ silent: true });
        }
        
        // 默认暂停，等待点击开始
        this.setRunningState(false);
        this.renderer.render(this.scene);
        this.updateUI();
        this.recordResetBaseline('init');
        
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
        const {
            invalidateFields = false,
            forceRender = false,
            updateUI = true,
            trackBaseline = true
        } = options;
        if (invalidateFields) {
            this.renderer.invalidateFields();
        }
        if (forceRender || this.scene.isPaused) {
            this.renderer.render(this.scene);
        }
        if (updateUI) {
            this.updateUI();
        }
        if (trackBaseline) {
            this.recordResetBaseline('requestRender');
        }
    }
    
	    bindEvents() {
        // 主题切换按钮
        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // 变量表
        document.getElementById('variables-btn')?.addEventListener('click', () => {
            this.variableEditor?.show?.();
        });

        // 演示模式切换
        document.getElementById('demo-mode-btn')?.addEventListener('click', () => {
            this.toggleDemoMode();
        });

        // 变量变更后，自动应用到已绑定表达式的对象（如粒子 vx/vy）
        document.addEventListener('scene-variables-changed', () => {
            this.applySceneVariableExpressions();
            this.requestRender({ updateUI: false });
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

	        // 比例尺（px ↔ m）
	        const scaleInput = document.getElementById('scale-px-per-meter');
        if (scaleInput) {
            scaleInput.value = String(this.scene.settings.pixelsPerMeter ?? 1);
            const applyScale = () => {
                if (this.isDemoMode()) return;
                const value = parseFloat(scaleInput.value);
                if (!Number.isFinite(value) || value <= 0) return;
                this.scene.settings.pixelsPerMeter = value;
                this.requestRender({ invalidateFields: true, updateUI: false });
            };
            scaleInput.addEventListener('change', applyScale);
        }

        // 重力加速度 g（m/s²）
        const gravityInput = document.getElementById('gravity-input');
        if (gravityInput) {
            gravityInput.value = String(this.scene.settings.gravity ?? 10);
            gravityInput.addEventListener('change', () => {
                if (this.isDemoMode()) return;
                const value = parseFloat(gravityInput.value);
                if (!Number.isFinite(value) || value < 0) return;
                this.scene.settings.gravity = value;
            });
        }

        // 边界处理
        const boundarySelect = document.getElementById('boundary-mode-select');
        const boundaryMarginInput = document.getElementById('boundary-margin-input');
        const boundaryMarginControl = document.getElementById('boundary-margin-control');

        const syncBoundaryMarginVisibility = () => {
            if (!boundaryMarginControl || !boundarySelect) return;
            boundaryMarginControl.style.display = boundarySelect.value === 'margin' ? '' : 'none';
        };

        if (boundarySelect) {
            boundarySelect.value = this.scene.settings.boundaryMode ?? 'margin';
            syncBoundaryMarginVisibility();
            boundarySelect.addEventListener('change', (e) => {
                this.scene.settings.boundaryMode = e.target.value;
                syncBoundaryMarginVisibility();
                this.requestRender({ updateUI: false });
            });
        }

        if (boundaryMarginInput) {
            boundaryMarginInput.value = String(this.scene.settings.boundaryMargin ?? 200);
            boundaryMarginInput.addEventListener('change', () => {
                const value = parseFloat(boundaryMarginInput.value);
                if (!Number.isFinite(value) || value < 0) return;
                this.scene.settings.boundaryMargin = value;
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

        const particleCanvas = document.getElementById('particle-canvas');
        particleCanvas?.addEventListener('wheel', (event) => this.handleDemoWheel(event), { passive: false });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
	    }

	    applySceneVariableExpressions() {
	        const scene = this.scene;
	        if (!scene) return;

	        const pixelsPerMeter = Number.isFinite(scene.settings?.pixelsPerMeter) && scene.settings.pixelsPerMeter > 0
	            ? scene.settings.pixelsPerMeter
	            : 1;

	        const vars = (scene.variables && typeof scene.variables === 'object' && !Array.isArray(scene.variables))
	            ? scene.variables
	            : {};
	        const allowedNames = Object.keys(vars);
	        const ctx = Object.create(null);
	        ctx.t = Number.isFinite(scene.time) ? scene.time : 0;
	        for (const [key, value] of Object.entries(vars)) {
	            ctx[key] = value;
	        }

	        let failed = 0;
	        for (const particle of scene.particles || []) {
	            if (!particle || particle.type !== 'particle') continue;

	            const vxExpr = typeof particle.vxExpr === 'string' ? particle.vxExpr.trim() : '';
	            if (vxExpr) {
	                try {
	                    const vx = compileSafeExpression(vxExpr, allowedNames)(ctx);
	                    if (Number.isFinite(vx)) particle.velocity.x = vx * pixelsPerMeter;
	                } catch {
	                    failed += 1;
	                }
	            }

	            const vyExpr = typeof particle.vyExpr === 'string' ? particle.vyExpr.trim() : '';
	            if (vyExpr) {
	                try {
	                    const vy = compileSafeExpression(vyExpr, allowedNames)(ctx);
	                    if (Number.isFinite(vy)) particle.velocity.y = vy * pixelsPerMeter;
	                } catch {
	                    failed += 1;
	                }
	            }
	        }

	        if (failed) {
	            this.showNotification(`有 ${failed} 个速度表达式无法计算`, 'warning');
	        }
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
        this.setRunningState(true);
    }
    
    stop() {
        this.setRunningState(false);
    }
    
    togglePlayPause() {
        this.setRunningState(!this.running);
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

        this.syncHeaderControlsFromScene();
    }
    
    reset() {
        const restored = this.restoreResetBaseline();
        if (restored) {
            this.showNotification('已重置到运动开始前状态', 'info');
            return;
        }
        this.showNotification('暂无可重置的起始状态', 'warning');
    }
    
    clearScene() {
        if (confirm('确定要清空整个场景吗？此操作不可撤销。')) {
            this.scene.clear();
            this.syncModeToSceneSettings();
            this.propertyPanel.hide();
            this.requestRender({ invalidateFields: true });
            this.showNotification('场景已清空', 'success');
        }
    }
    
    saveScene() {
        const sceneName = prompt('请输入场景名称:', 'my-scene');
        if (!sceneName) return false;
        Serializer.saveSceneData(this.buildSceneData(), sceneName);
        this.showNotification(`场景 "${sceneName}" 已保存`, 'success');
        return true;
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
                    this.applyUIFromSceneData(loadedData);
                    this.syncModeToSceneSettings();
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
            this.syncModeToSceneSettings();
            this.requestRender({ invalidateFields: true });
            this.showNotification(`已加载预设场景: ${preset.name}`, 'success');
        } catch (error) {
            console.error('加载预设失败:', error);
            this.showNotification('加载预设失败: ' + error.message, 'error');
        }
    }
    
    exportScene() {
        try {
            const sceneData = this.buildSceneData();
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
                this.applyUIFromSceneData(data);
                this.syncModeToSceneSettings();
                this.propertyPanel.hide();
                this.requestRender({ invalidateFields: true });
                
                const objectCount = Array.isArray(data.objects) ? data.objects.length : 0;
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
    window.registry = registry;
    window.app = new Application();
});
