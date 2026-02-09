/**
 * 属性面板
 */

import { compileSafeExpression } from '../utils/SafeExpression.js';
import { registry } from '../core/registerObjects.js';
import { SchemaForm } from './SchemaForm.js';

function escapeAttr(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function readFiniteNumber(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const raw = el.value;
    if (typeof raw === 'string' && raw.trim() === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
}

export class PropertyPanel {
    constructor(scene) {
        this.scene = scene;
        this.currentObject = null;
        this.init();
    }
    
    init() {
        // 监听显示属性事件
        document.addEventListener('show-properties', (e) => {
            this.show(e.detail.object);
        });

        // 变量变更时，刷新当前面板（用于表达式预览）
        document.addEventListener('scene-variables-changed', () => {
            if (!this.currentObject) return;
            const panel = document.getElementById('property-panel');
            if (!panel || panel.style.display === 'none') return;
            this.show(this.currentObject);
        });
    }
    
    show(object) {
        this.currentObject = object;
        const content = document.getElementById('property-content');
        content.innerHTML = '';

        const entry = registry.get(object?.type);
        if (!entry || typeof entry.schema !== 'function') {
            content.textContent = '暂无可编辑属性';
            this.openPanel();
            return;
        }

        const form = new SchemaForm({
            container: content,
            schema: entry.schema(),
            object,
            scene: this.scene
        });
        this.schemaForm = form;
        form.render();

        const actions = document.createElement('div');
        actions.className = 'form-row';
        const applyBtn = document.createElement('button');
        applyBtn.className = 'btn btn-primary';
        applyBtn.textContent = '应用';
        actions.appendChild(applyBtn);

        const maybeClear = object.type === 'particle';
        if (maybeClear) {
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn';
            clearBtn.textContent = '清空轨迹';
            clearBtn.addEventListener('click', () => {
                object.clearTrajectory?.();
                window.app?.requestRender?.({ updateUI: false });
            });
            actions.appendChild(clearBtn);
        }

        content.appendChild(actions);

        applyBtn.addEventListener('click', () => {
            const result = form.apply();
            if (!result.ok) {
                window.app?.showNotification?.('属性填写有误，请检查红色提示', 'error');
                return;
            }

            if (object.type === 'electron-gun') {
                object._emitAccumulator = 0;
            }
            if (typeof object.resetRuntime === 'function') {
                object.resetRuntime();
            }

            const invalidateFields = entry.rendererKey !== 'particle';
            window.app?.requestRender?.({ invalidateFields, updateUI: false });
        });

        this.openPanel();
    }
    
    hide() {
        this.closePanel();
        this.currentObject = null;
    }

    openPanel() {
        const panel = document.getElementById('property-panel');
        const app = document.getElementById('app');
        if (!panel) return;

        panel.style.display = 'flex';
        panel.classList.remove('open');
        app?.classList.add('panel-open');

        requestAnimationFrame(() => {
            panel.classList.add('open');
        });
        window.app?.handleResize?.();
    }

    closePanel() {
        const panel = document.getElementById('property-panel');
        const app = document.getElementById('app');
        if (!panel) return;

        panel.classList.remove('open');
        app?.classList.remove('panel-open');

        const isDrawer = window.matchMedia?.('(max-width: 1200px)')?.matches;
        if (isDrawer) {
            const hide = () => {
                panel.style.display = 'none';
                panel.removeEventListener('transitionend', hide);
            };
            panel.addEventListener('transitionend', hide);
            setTimeout(hide, 350);
        } else {
            panel.style.display = 'none';
        }

        window.app?.handleResize?.();
    }
    
	    renderParticleProperties(container, particle) {
	        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
	            ? this.scene.settings.pixelsPerMeter
	            : 1;
        const gravity = Number.isFinite(this.scene?.settings?.gravity) ? this.scene.settings.gravity : 10;
        const trajectoryRetention = particle.trajectoryRetention === 'seconds' ? 'seconds' : 'infinite';
	        const trajectorySeconds = Number.isFinite(particle.trajectorySeconds) && particle.trajectorySeconds > 0
	            ? particle.trajectorySeconds
	            : 8;
	        const vxDisplay = typeof particle.vxExpr === 'string' && particle.vxExpr.trim()
	            ? particle.vxExpr.trim()
	            : String((Number.isFinite(particle.velocity?.x) ? particle.velocity.x : 0) / pixelsPerMeter);
	        const vyDisplay = typeof particle.vyExpr === 'string' && particle.vyExpr.trim()
	            ? particle.vyExpr.trim()
	            : String((Number.isFinite(particle.velocity?.y) ? particle.velocity.y : 0) / pixelsPerMeter);
	        container.innerHTML = `
	            <h4>粒子属性</h4>
	            <div class="form-row">
	                <label>质量 (kg)</label>
	                <input type="number" id="prop-mass" value="${particle.mass}" step="1e-31">
	            </div>
	            <div class="form-row">
	                <label>电荷量 (C)</label>
	                <input type="number" id="prop-charge" value="${particle.charge}" step="1e-19">
	            </div>
	            <div class="form-row">
	                <label>当前速度 vx (m/s)</label>
	                <input type="text" id="prop-vx" value="${escapeAttr(vxDisplay)}" placeholder="例如：v0/sqrt(2)" inputmode="decimal">
	                <div class="expression-hint" id="prop-vx-preview"></div>
	            </div>
	            <div class="form-row">
	                <label>当前速度 vy (m/s)</label>
	                <input type="text" id="prop-vy" value="${escapeAttr(vyDisplay)}" placeholder="例如：-v0/sqrt(2)" inputmode="decimal">
	                <div class="expression-hint" id="prop-vy-preview"></div>
	            </div>
	            <div class="form-row">
	                <label>半径 (px)</label>
	                <input type="number" id="prop-radius" value="${particle.radius}" min="2" max="20">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-ignore-gravity" ${particle.ignoreGravity ? 'checked' : ''}>
                    忽略重力
                </label>
            </div>
            <div class="form-row">
                <label>重力加速度 g (m/s²)</label>
                <input type="number" id="prop-gravity" value="${gravity}" min="0" step="0.1" ${particle.ignoreGravity ? 'disabled' : ''}>
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-trajectory" ${particle.showTrajectory ? 'checked' : ''}>
                    显示轨迹
                </label>
            </div>
            <div class="form-row" id="row-trajectory-retention">
                <label>轨迹保留</label>
                <select id="prop-trajectory-retention">
                    <option value="infinite" ${trajectoryRetention !== 'seconds' ? 'selected' : ''}>永久</option>
                    <option value="seconds" ${trajectoryRetention === 'seconds' ? 'selected' : ''}>最近 N 秒</option>
                </select>
            </div>
            <div class="form-row" id="row-trajectory-seconds" style="${trajectoryRetention === 'seconds' ? '' : 'display:none;'}">
                <label>显示最近 (s)</label>
                <input type="number" id="prop-trajectory-seconds" value="${trajectorySeconds}" min="0.1" step="0.1">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-velocity" ${particle.showVelocity ? 'checked' : ''}>
                    显示速度
                </label>
            </div>
            <div class="form-row">
                <label>速度显示方式</label>
                <select id="prop-velocity-display-mode">
                    <option value="vector" ${particle.velocityDisplayMode !== 'speed' ? 'selected' : ''}>矢量</option>
                    <option value="speed" ${particle.velocityDisplayMode === 'speed' ? 'selected' : ''}>数值</option>
                </select>
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-energy" ${particle.showEnergy ? 'checked' : ''}>
                    显示能量
                </label>
            </div>
            <hr>
            <h4>受力分析</h4>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-show-forces" ${particle.showForces ? 'checked' : ''}>
                    显示受力
                </label>
            </div>
            <div class="form-row" id="row-force-options">
                <label>
                    <input type="checkbox" id="prop-force-electric" ${particle.showForceElectric ? 'checked' : ''}>
                    电场力 Fe
                </label>
                <label>
                    <input type="checkbox" id="prop-force-magnetic" ${particle.showForceMagnetic ? 'checked' : ''}>
                    磁场力 Fm
                </label>
                <label>
                    <input type="checkbox" id="prop-force-gravity" ${particle.showForceGravity ? 'checked' : ''}>
                    重力 Fg
                </label>
                <label>
                    <input type="checkbox" id="prop-force-net" ${particle.showForceNet ? 'checked' : ''}>
                    合力 ΣF
                </label>
            </div>
            <button class="btn btn-primary" id="apply-particle-props">应用</button>
            <button class="btn" id="clear-trajectory">清空轨迹</button>
        `;

        const showVelocityInput = document.getElementById('prop-show-velocity');
        const velocityModeInput = document.getElementById('prop-velocity-display-mode');
        const syncVelocityModeState = () => {
            if (velocityModeInput && showVelocityInput) {
                velocityModeInput.disabled = !showVelocityInput.checked;
            }
        };
        syncVelocityModeState();
        showVelocityInput?.addEventListener('change', syncVelocityModeState);

        const ignoreGravityInput = document.getElementById('prop-ignore-gravity');
        const gravityInput = document.getElementById('prop-gravity');
        const syncGravityState = () => {
            if (!ignoreGravityInput || !gravityInput) return;
            gravityInput.disabled = !!ignoreGravityInput.checked;
        };
        syncGravityState();
        ignoreGravityInput?.addEventListener('change', syncGravityState);

        const showTrajectoryInput = document.getElementById('prop-show-trajectory');
        const retentionSelect = document.getElementById('prop-trajectory-retention');
        const secondsRow = document.getElementById('row-trajectory-seconds');
        const secondsInput = document.getElementById('prop-trajectory-seconds');
        const syncTrajectoryState = () => {
            if (!showTrajectoryInput || !retentionSelect || !secondsRow) return;
            const enabled = !!showTrajectoryInput.checked;
            retentionSelect.disabled = !enabled;
            const retention = retentionSelect.value;
            secondsRow.style.display = enabled && retention === 'seconds' ? '' : 'none';
            if (secondsInput) {
                secondsInput.disabled = !enabled || retention !== 'seconds';
            }
        };
        syncTrajectoryState();
        showTrajectoryInput?.addEventListener('change', syncTrajectoryState);
        retentionSelect?.addEventListener('change', syncTrajectoryState);

	        const showForcesInput = document.getElementById('prop-show-forces');
	        const forceOptionsRow = document.getElementById('row-force-options');
        const syncForceState = () => {
            if (!showForcesInput || !forceOptionsRow) return;
            const enabled = !!showForcesInput.checked;
            forceOptionsRow.querySelectorAll('input[type="checkbox"]').forEach(input => {
                input.disabled = !enabled;
            });
        };
	        syncForceState();
	        showForcesInput?.addEventListener('change', syncForceState);

	        const NUMBER_FULL_RE = /^[+-]?(?:\d+\.\d*|\d+|\.\d+)(?:[eE][+-]?\d+)?$/;
	        const getAllowedVariableNames = () => {
	            const vars = this.scene?.variables;
	            if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return [];
	            return Object.keys(vars);
	        };
	        const buildEvalContext = () => {
	            const ctx = Object.create(null);
	            ctx.t = Number.isFinite(this.scene?.time) ? this.scene.time : 0;
	            const vars = this.scene?.variables;
	            if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
	                for (const [key, value] of Object.entries(vars)) {
	                    ctx[key] = value;
	                }
	            }
	            return ctx;
	        };
	        const parseMpsOrExpression = (raw) => {
	            const text = String(raw ?? '').trim();
	            if (!text) return { ok: true, empty: true, value: null, expr: null };
	            if (NUMBER_FULL_RE.test(text)) {
	                const value = Number(text);
	                return Number.isFinite(value) ? { ok: true, empty: false, value, expr: null } : { ok: false, error: '数值无效' };
	            }
	            try {
	                const fn = compileSafeExpression(text, getAllowedVariableNames());
	                const value = fn(buildEvalContext());
	                if (!Number.isFinite(value)) return { ok: false, error: '结果不是有限数' };
	                return { ok: true, empty: false, value, expr: text };
	            } catch (error) {
	                return { ok: false, error: error?.message || '表达式解析失败' };
	            }
	        };
	        const formatPreviewNumber = (value) => {
	            if (!Number.isFinite(value)) return '0';
	            const abs = Math.abs(value);
	            if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return value.toExponential(3);
	            return String(Math.round(value * 1000) / 1000);
	        };
	        const updatePreview = (inputEl, previewEl) => {
	            if (!inputEl || !previewEl) return;
	            const parsed = parseMpsOrExpression(inputEl.value);
	            if (!parsed.ok) {
	                previewEl.textContent = `错误：${parsed.error}`;
	                previewEl.classList.add('error');
	                previewEl.classList.remove('ok');
	                return;
	            }
	            if (parsed.empty) {
	                previewEl.textContent = '可填“数值”或“表达式”，变量在顶部“ƒx 变量表”中设置';
	                previewEl.classList.remove('error');
	                previewEl.classList.remove('ok');
	                return;
	            }
	            previewEl.textContent = `预览：${formatPreviewNumber(parsed.value)} m/s`;
	            previewEl.classList.remove('error');
	            previewEl.classList.add('ok');
	        };

	        const vxInputEl = document.getElementById('prop-vx');
	        const vyInputEl = document.getElementById('prop-vy');
	        const vxPreviewEl = document.getElementById('prop-vx-preview');
	        const vyPreviewEl = document.getElementById('prop-vy-preview');
	        updatePreview(vxInputEl, vxPreviewEl);
	        updatePreview(vyInputEl, vyPreviewEl);
	        vxInputEl?.addEventListener('input', () => updatePreview(vxInputEl, vxPreviewEl));
	        vyInputEl?.addEventListener('input', () => updatePreview(vyInputEl, vyPreviewEl));
	        
	        document.getElementById('apply-particle-props').addEventListener('click', () => {
	            const mass = parseFloat(document.getElementById('prop-mass')?.value);
	            if (Number.isFinite(mass) && mass > 0) {
	                particle.mass = mass;
	            }

            const charge = parseFloat(document.getElementById('prop-charge')?.value);
	            if (Number.isFinite(charge)) {
	                particle.charge = charge;
	            }

	            const vxParsed = parseMpsOrExpression(document.getElementById('prop-vx')?.value);
	            if (!vxParsed.ok) {
	                window.app?.showNotification?.(`vx 设置失败：${vxParsed.error}`, 'error');
	                return;
	            }
	            if (vxParsed.empty) {
	                particle.vxExpr = null;
	            } else {
	                particle.velocity.x = vxParsed.value * pixelsPerMeter;
	                particle.vxExpr = vxParsed.expr;
	            }

	            const vyParsed = parseMpsOrExpression(document.getElementById('prop-vy')?.value);
	            if (!vyParsed.ok) {
	                window.app?.showNotification?.(`vy 设置失败：${vyParsed.error}`, 'error');
	                return;
	            }
	            if (vyParsed.empty) {
	                particle.vyExpr = null;
	            } else {
	                particle.velocity.y = vyParsed.value * pixelsPerMeter;
	                particle.vyExpr = vyParsed.expr;
	            }

	            const radius = parseFloat(document.getElementById('prop-radius')?.value);
	            if (Number.isFinite(radius) && radius > 0) {
	                particle.radius = radius;
	            }

            particle.ignoreGravity = document.getElementById('prop-ignore-gravity')?.checked ?? particle.ignoreGravity;
            if (!particle.ignoreGravity) {
                const g = parseFloat(document.getElementById('prop-gravity')?.value);
                if (Number.isFinite(g) && g >= 0) {
                    this.scene.settings.gravity = g;
                    window.app?.syncHeaderControlsFromScene?.();
                }
            }
            particle.showTrajectory = document.getElementById('prop-show-trajectory')?.checked ?? particle.showTrajectory;
            particle.trajectoryRetention = document.getElementById('prop-trajectory-retention')?.value === 'seconds'
                ? 'seconds'
                : 'infinite';

            const nextSeconds = parseFloat(document.getElementById('prop-trajectory-seconds')?.value);
            if (Number.isFinite(nextSeconds) && nextSeconds > 0) {
                particle.trajectorySeconds = nextSeconds;
            }
            particle.pruneTrajectory?.(this.scene?.time);
            particle.showVelocity = document.getElementById('prop-show-velocity')?.checked ?? particle.showVelocity;
            particle.velocityDisplayMode = document.getElementById('prop-velocity-display-mode')?.value ?? particle.velocityDisplayMode;
            particle.showEnergy = document.getElementById('prop-show-energy')?.checked ?? particle.showEnergy;
            particle.showForces = document.getElementById('prop-show-forces')?.checked ?? particle.showForces;
            particle.showForceElectric = document.getElementById('prop-force-electric')?.checked ?? particle.showForceElectric;
            particle.showForceMagnetic = document.getElementById('prop-force-magnetic')?.checked ?? particle.showForceMagnetic;
            particle.showForceGravity = document.getElementById('prop-force-gravity')?.checked ?? particle.showForceGravity;
            particle.showForceNet = document.getElementById('prop-force-net')?.checked ?? particle.showForceNet;
            window.app?.requestRender?.({ updateUI: false });
        });
        
        document.getElementById('clear-trajectory').addEventListener('click', () => {
            particle.clearTrajectory();
            window.app?.requestRender?.({ updateUI: false });
        });
    }
    
    renderElectricFieldProperties(container, field) {
        let extraFields = '';
        
        // 为半圆电场添加朝向参数
        if (field.type === 'semicircle-electric-field') {
            extraFields = `
            <div class="form-row">
                <label>朝向 (度)</label>
                <input type="number" id="prop-orientation" value="${field.orientation || 0}" min="0" max="360">
            </div>
            `;
        }
        
        // 为平行板电容器添加极性/电源参数
        const isCapacitor = field.type === 'parallel-plate-capacitor' || field.type === 'vertical-parallel-plate-capacitor';
        if (isCapacitor) {
            const plateSizeRow = field.type === 'parallel-plate-capacitor' ? `
            <div class="form-row">
                <label>板长度</label>
                <input type="number" id="prop-plate-width" value="${field.width}" min="50" step="10">
            </div>
            ` : '';

            const polarityOptions = field.type === 'vertical-parallel-plate-capacitor' ? `
                    <option value="1" ${field.polarity === 1 ? 'selected' : ''}>向上</option>
                    <option value="-1" ${field.polarity === -1 ? 'selected' : ''}>向下</option>
                ` : `
                    <option value="1" ${field.polarity === 1 ? 'selected' : ''}>沿方向</option>
                    <option value="-1" ${field.polarity === -1 ? 'selected' : ''}>反向</option>
                `;

            extraFields = `
            ${plateSizeRow}
            <div class="form-row">
                <label>板间距离</label>
                <input type="number" id="prop-plate-distance" value="${field.plateDistance}" min="20" step="10">
            </div>
            <div class="form-row">
                <label>极性</label>
                <select id="prop-polarity">
                    ${polarityOptions}
                </select>
            </div>
            <div class="form-row">
                <label>电源类型</label>
                <select id="prop-source-type">
                    <option value="dc" ${field.sourceType !== 'ac' && field.sourceType !== 'custom' ? 'selected' : ''}>直流</option>
                    <option value="ac" ${field.sourceType === 'ac' ? 'selected' : ''}>交流</option>
                    <option value="custom" ${field.sourceType === 'custom' ? 'selected' : ''}>自定义</option>
                </select>
            </div>
            <div class="form-row ac-only">
                <label>交流幅值 (N/C)</label>
                <input type="number" id="prop-ac-amplitude" value="${field.acAmplitude ?? field.strength}" step="100">
            </div>
            <div class="form-row ac-only">
                <label>频率 (Hz)</label>
                <input type="number" id="prop-ac-frequency" value="${field.acFrequency ?? 50}" min="0" step="1">
            </div>
            <div class="form-row ac-only">
                <label>相位 (度)</label>
                <input type="number" id="prop-ac-phase" value="${field.acPhase ?? 0}" step="5">
            </div>
            <div class="form-row ac-only">
                <label>直流偏置 (N/C)</label>
                <input type="number" id="prop-dc-bias" value="${field.dcBias ?? 0}" step="100">
            </div>
            <div class="form-row ac-only">
                <label>波形</label>
                <select id="prop-waveform">
                    <option value="sine" ${field.waveform === 'sine' ? 'selected' : ''}>正弦</option>
                    <option value="square" ${field.waveform === 'square' ? 'selected' : ''}>方波</option>
                    <option value="triangle" ${field.waveform === 'triangle' ? 'selected' : ''}>三角波</option>
                </select>
            </div>
            <div class="form-row custom-only">
                <label>自定义 U(t)</label>
                <textarea id="prop-custom-expression" rows="2" placeholder="例如：Math.sin(2*Math.PI*50*t)">${field.customExpression || 'Math.sin(2*Math.PI*50*t)'}</textarea>
            </div>
            `;
        }
        
        container.innerHTML = `
            <h4>电场属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-x" value="${field.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-y" value="${field.y}" step="10">
            </div>
            ${(field.width !== undefined && field.height !== undefined && field.type !== 'vertical-parallel-plate-capacitor') ? `
            <div class="form-row">
                <label>宽度</label>
                <input type="number" id="prop-width" value="${field.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>高度</label>
                <input type="number" id="prop-height" value="${field.height}" min="50" step="10">
            </div>
            ` : ''}
            ${(field.type === 'vertical-parallel-plate-capacitor') ? `
            <div class="form-row">
                <label>高度</label>
                <input type="number" id="prop-height" value="${field.height}" min="50" step="10">
            </div>
            ` : ''}
            ${field.radius !== undefined ? `
            <div class="form-row">
                <label>半径</label>
                <input type="number" id="prop-radius" value="${field.radius}" min="20" step="10">
            </div>
            ` : ''}
            <div class="form-row">
                <label>场强 (N/C)</label>
                <input type="number" id="prop-strength" value="${field.strength}" step="100">
            </div>
            ${(field.type !== 'vertical-parallel-plate-capacitor') ? `
            <div class="form-row">
                <label>方向 (度)</label>
                <input type="number" id="prop-direction" value="${field.direction}" min="0" max="360">
            </div>
            ` : ''}
            ${extraFields}
            <button class="btn btn-primary" id="apply-field-props">应用</button>
        `;

        // 切换交流相关字段显示
        const sourceTypeSelect = document.getElementById('prop-source-type');
        const acOnlyRows = container.querySelectorAll('.ac-only');
        const customRows = container.querySelectorAll('.custom-only');
        const toggleAcFields = () => {
            const isAc = sourceTypeSelect && sourceTypeSelect.value === 'ac';
            const isCustom = sourceTypeSelect && sourceTypeSelect.value === 'custom';
            acOnlyRows.forEach(row => row.style.display = isAc ? '' : 'none');
            customRows.forEach(row => row.style.display = isCustom ? '' : 'none');
        };
        if (sourceTypeSelect) {
            toggleAcFields();
            sourceTypeSelect.addEventListener('change', toggleAcFields);
        }
        
	        document.getElementById('apply-field-props').addEventListener('click', () => {
	            const x = readFiniteNumber('prop-x');
	            if (x !== null) field.x = x;
	            const y = readFiniteNumber('prop-y');
	            if (y !== null) field.y = y;
	            if (field.width !== undefined && field.height !== undefined && field.type !== 'vertical-parallel-plate-capacitor') {
	                const width = readFiniteNumber('prop-width');
	                if (width !== null && width > 0) field.width = width;
	                const height = readFiniteNumber('prop-height');
	                if (height !== null && height > 0) field.height = height;
	            }
	            if (field.type === 'vertical-parallel-plate-capacitor') {
	                const height = readFiniteNumber('prop-height');
	                if (height !== null && height > 0) field.height = height;
	            }
	            if (field.radius !== undefined) {
	                const radius = readFiniteNumber('prop-radius');
	                if (radius !== null && radius > 0) field.radius = radius;
	            }
	            const strength = readFiniteNumber('prop-strength');
	            if (strength !== null) field.strength = strength;
	            const direction = readFiniteNumber('prop-direction');
	            if (direction !== null) field.direction = direction;
	            
	            // 处理特定属性
	            if (field.type === 'semicircle-electric-field') {
	                const orientation = readFiniteNumber('prop-orientation');
	                if (orientation !== null) field.orientation = orientation;
	            }
	            
	            if (field.type === 'parallel-plate-capacitor' || field.type === 'vertical-parallel-plate-capacitor') {
	                const plateWidth = readFiniteNumber('prop-plate-width');
	                if (plateWidth !== null && plateWidth > 0) field.width = plateWidth;
	                const plateDistance = readFiniteNumber('prop-plate-distance');
	                if (plateDistance !== null && plateDistance > 0) field.plateDistance = plateDistance;

	                const polarityInput = document.getElementById('prop-polarity');
	                if (polarityInput) {
	                    const polarity = parseInt(polarityInput.value, 10);
	                    if (Number.isFinite(polarity)) field.polarity = polarity;
	                }

	                const sourceTypeInput = document.getElementById('prop-source-type');
	                if (sourceTypeInput) field.sourceType = sourceTypeInput.value;

	                const acAmplitude = readFiniteNumber('prop-ac-amplitude');
	                if (acAmplitude !== null) field.acAmplitude = acAmplitude;
	                const acFrequency = readFiniteNumber('prop-ac-frequency');
	                if (acFrequency !== null) field.acFrequency = acFrequency;
	                const acPhase = readFiniteNumber('prop-ac-phase');
	                if (acPhase !== null) field.acPhase = acPhase;
	                const dcBias = readFiniteNumber('prop-dc-bias');
	                if (dcBias !== null) field.dcBias = dcBias;

	                const waveformInput = document.getElementById('prop-waveform');
	                if (waveformInput) field.waveform = waveformInput.value;

	                const customExprInput = document.getElementById('prop-custom-expression');
	                if (customExprInput) {
	                    field.customExpression = customExprInput.value || '0';
	                    field.compileCustomExpression?.();
	                }
	            }
	            
	            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
	        });
    }

    renderElectronGunProperties(container, emitter) {
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : 1;
        const gravity = Number.isFinite(this.scene?.settings?.gravity) ? this.scene.settings.gravity : 10;
        const presets = emitter.constructor?.PARTICLE_PRESETS || {};
        const presetOptions = Object.entries(presets).map(
            ([key, value]) => `<option value="${key}" ${emitter.particleType === key ? 'selected' : ''}>${value.label || key}</option>`
        ).join('');
        const options = presetOptions + `<option value="custom" ${emitter.particleType === 'custom' ? 'selected' : ''}>自定义</option>`;

        container.innerHTML = `
            <h4>电子枪属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-gun-x" value="${emitter.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-gun-y" value="${emitter.y}" step="10">
            </div>
            <div class="form-row">
                <label>发射方向 (度)</label>
                <input type="number" id="prop-gun-direction" value="${emitter.direction}" min="0" max="360">
            </div>
            <div class="form-row">
                <label>发射频率 (个/秒)</label>
                <input type="number" id="prop-gun-rate" value="${emitter.emissionRate}" min="0" step="0.5">
            </div>
            <div class="form-row">
                <label>发射初速度 (m/s)</label>
                <input type="number" id="prop-gun-speed" value="${emitter.emissionSpeed / pixelsPerMeter}" step="10">
            </div>
            <div class="form-row">
                <label>粒子类型</label>
                <select id="prop-gun-particle-type">${options}</select>
            </div>
            <div class="form-row">
                <label>粒子电荷 (C)</label>
                <input type="number" id="prop-gun-charge" value="${emitter.particleCharge}" step="1e-20">
            </div>
            <div class="form-row">
                <label>粒子质量 (kg)</label>
                <input type="number" id="prop-gun-mass" value="${emitter.particleMass}" step="1e-30">
            </div>
            <div class="form-row">
                <label>粒子半径 (px)</label>
                <input type="number" id="prop-gun-radius" value="${emitter.particleRadius}" min="2" max="20">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-gun-ignore-gravity" ${emitter.ignoreGravity ? 'checked' : ''}>
                    忽略重力
                </label>
            </div>
            <div class="form-row">
                <label>重力加速度 g (m/s²)</label>
                <input type="number" id="prop-gun-gravity" value="${gravity}" min="0" step="0.1" ${emitter.ignoreGravity ? 'disabled' : ''}>
            </div>
            <hr>
            <h4>显示</h4>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-gun-show-velocity" ${emitter.showVelocity ? 'checked' : ''}>
                    显示发射速度
                </label>
            </div>
            <div class="form-row">
                <label>速度显示方式</label>
                <select id="prop-gun-velocity-display-mode">
                    <option value="vector" ${emitter.velocityDisplayMode !== 'speed' ? 'selected' : ''}>矢量</option>
                    <option value="speed" ${emitter.velocityDisplayMode === 'speed' ? 'selected' : ''}>数值</option>
                </select>
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-gun-show-energy" ${emitter.showEnergy ? 'checked' : ''}>
                    显示发射能量
                </label>
            </div>
            <button class="btn btn-primary" id="apply-gun-props">应用</button>
        `;

        const typeSelect = document.getElementById('prop-gun-particle-type');
        const chargeInput = document.getElementById('prop-gun-charge');
        const massInput = document.getElementById('prop-gun-mass');

        const applyPreset = () => {
            const preset = presets[typeSelect.value];
            if (preset) {
                chargeInput.value = preset.charge;
                massInput.value = preset.mass;
            }
        };

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                if (presets[typeSelect.value]) {
                    applyPreset();
                }
            });
        }

        const showGunVelocityInput = document.getElementById('prop-gun-show-velocity');
        const gunVelocityModeInput = document.getElementById('prop-gun-velocity-display-mode');
        const syncGunVelocityModeState = () => {
            if (gunVelocityModeInput && showGunVelocityInput) {
                gunVelocityModeInput.disabled = !showGunVelocityInput.checked;
            }
        };
        syncGunVelocityModeState();
        showGunVelocityInput?.addEventListener('change', syncGunVelocityModeState);

        const ignoreGravityInput = document.getElementById('prop-gun-ignore-gravity');
        const gravityInput = document.getElementById('prop-gun-gravity');
        const syncGravityState = () => {
            if (!ignoreGravityInput || !gravityInput) return;
            gravityInput.disabled = !!ignoreGravityInput.checked;
        };
        syncGravityState();
        ignoreGravityInput?.addEventListener('change', syncGravityState);

	        document.getElementById('apply-gun-props').addEventListener('click', () => {
	            const x = readFiniteNumber('prop-gun-x');
	            if (x !== null) emitter.x = x;
	            const y = readFiniteNumber('prop-gun-y');
	            if (y !== null) emitter.y = y;
	            const direction = readFiniteNumber('prop-gun-direction');
	            if (direction !== null) emitter.direction = direction;
	            const rate = readFiniteNumber('prop-gun-rate');
	            if (rate !== null && rate >= 0) emitter.emissionRate = rate;
	            const speed = readFiniteNumber('prop-gun-speed');
	            if (speed !== null && speed >= 0) emitter.emissionSpeed = speed * pixelsPerMeter;

	            const chosenType = typeSelect.value;
	            emitter.particleType = chosenType;
	            if (presets[chosenType]) {
                applyPreset();
            }

	            const charge = readFiniteNumber('prop-gun-charge');
	            if (charge !== null) emitter.particleCharge = charge;
	            const mass = readFiniteNumber('prop-gun-mass');
	            if (mass !== null && mass > 0) emitter.particleMass = mass;
	            const radius = readFiniteNumber('prop-gun-radius');
	            if (radius !== null && radius > 0) emitter.particleRadius = radius;
	            emitter.ignoreGravity = document.getElementById('prop-gun-ignore-gravity').checked;
	            if (!emitter.ignoreGravity) {
	                const g = readFiniteNumber('prop-gun-gravity');
	                if (g !== null && g >= 0) {
	                    this.scene.settings.gravity = g;
	                    window.app?.syncHeaderControlsFromScene?.();
	                }
	            }

            emitter.showVelocity = document.getElementById('prop-gun-show-velocity').checked;
            emitter.velocityDisplayMode = document.getElementById('prop-gun-velocity-display-mode').value;
            emitter.showEnergy = document.getElementById('prop-gun-show-energy').checked;

            emitter._emitAccumulator = 0;
            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
        });
    }

    renderProgrammableEmitterProperties(container, emitter) {
        const pixelsPerMeter = Number.isFinite(this.scene?.settings?.pixelsPerMeter) && this.scene.settings.pixelsPerMeter > 0
            ? this.scene.settings.pixelsPerMeter
            : 1;
        const gravity = Number.isFinite(this.scene?.settings?.gravity) ? this.scene.settings.gravity : 10;

        const presets = emitter.constructor?.PARTICLE_PRESETS || {};
        const presetOptions = Object.entries(presets).map(
            ([key, value]) => `<option value="${key}" ${emitter.particleType === key ? 'selected' : ''}>${value.label || key}</option>`
        ).join('');
        const options = presetOptions + `<option value="custom" ${emitter.particleType === 'custom' ? 'selected' : ''}>自定义</option>`;

        const emissionMode = emitter.emissionMode || 'burst';
        const angleMode = emitter.angleMode || 'fixed';
        const speedMode = emitter.speedMode || 'fixed';
        const timeListText = Array.isArray(emitter.timeList) ? emitter.timeList.join(', ') : '';
        const angleListText = Array.isArray(emitter.angleList) ? emitter.angleList.join(', ') : '';
        const speedListText = Array.isArray(emitter.speedList)
            ? emitter.speedList.map(v => (Number.isFinite(v) ? v : 0) / pixelsPerMeter).join(', ')
            : '';

        const speedMinValue = (Number.isFinite(emitter.speedMin) ? emitter.speedMin : (emitter.emissionSpeed ?? 0)) / pixelsPerMeter;
        const speedMaxValue = (Number.isFinite(emitter.speedMax) ? emitter.speedMax : (emitter.emissionSpeed ?? 0)) / pixelsPerMeter;
        const speedFixedValue = (Number.isFinite(emitter.emissionSpeed) ? emitter.emissionSpeed : 0) / pixelsPerMeter;

        container.innerHTML = `
            <h4>粒子发射器属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-pe-x" value="${emitter.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-pe-y" value="${emitter.y}" step="10">
            </div>
            <hr>
            <h4>发射计划</h4>
            <div class="form-row">
                <label>开始时间 (s)</label>
                <input type="number" id="prop-pe-start-time" value="${emitter.startTime ?? 0}" min="0" step="0.1">
            </div>
            <div class="form-row">
                <label>模式</label>
                <select id="prop-pe-mode">
                    <option value="burst" ${emissionMode === 'burst' ? 'selected' : ''}>同时发射</option>
                    <option value="sequence" ${emissionMode === 'sequence' ? 'selected' : ''}>顺序发射</option>
                    <option value="time-list" ${emissionMode === 'time-list' ? 'selected' : ''}>自定义时间表</option>
                </select>
            </div>
            <div class="form-row">
                <label>粒子数</label>
                <input type="number" id="prop-pe-count" value="${emitter.emissionCount ?? 0}" min="0" step="1">
            </div>
            <div class="form-row" id="row-pe-interval" style="${emissionMode === 'sequence' ? '' : 'display:none;'}">
                <label>间隔 (s)</label>
                <input type="number" id="prop-pe-interval" value="${emitter.emissionInterval ?? 0.2}" min="0" step="0.01">
            </div>
            <div class="form-row" id="row-pe-time-list" style="${emissionMode === 'time-list' ? '' : 'display:none;'}">
                <label>时间表 (s，相对开始时间)</label>
                <textarea id="prop-pe-time-list" rows="2" placeholder="例如：0, 0.2, 0.4">${timeListText}</textarea>
            </div>
            <hr>
            <h4>初速度</h4>
            <div class="form-row">
                <label>速度模式</label>
                <select id="prop-pe-speed-mode">
                    <option value="fixed" ${speedMode === 'fixed' ? 'selected' : ''}>固定</option>
                    <option value="random" ${speedMode === 'random' ? 'selected' : ''}>随机</option>
                    <option value="list" ${speedMode === 'list' ? 'selected' : ''}>数组</option>
                    <option value="arithmetic" ${speedMode === 'arithmetic' ? 'selected' : ''}>等差</option>
                </select>
            </div>
            <div class="form-row" id="row-pe-speed-fixed" style="${speedMode === 'fixed' ? '' : 'display:none;'}">
                <label>固定速度 (m/s)</label>
                <input type="number" id="prop-pe-speed-fixed" value="${speedFixedValue}" step="10">
            </div>
            <div class="form-row" id="row-pe-speed-min" style="${speedMode === 'random' || speedMode === 'arithmetic' ? '' : 'display:none;'}">
                <label>最小速度 (m/s)</label>
                <input type="number" id="prop-pe-speed-min" value="${speedMinValue}" min="0" step="10">
            </div>
            <div class="form-row" id="row-pe-speed-max" style="${speedMode === 'random' || speedMode === 'arithmetic' ? '' : 'display:none;'}">
                <label>最大速度 (m/s)</label>
                <input type="number" id="prop-pe-speed-max" value="${speedMaxValue}" min="0" step="10">
            </div>
            <div class="form-row" id="row-pe-speed-list" style="${speedMode === 'list' ? '' : 'display:none;'}">
                <label>速度数组 (m/s)</label>
                <textarea id="prop-pe-speed-list" rows="2" placeholder="例如：100, 200, 300">${speedListText}</textarea>
            </div>
            <div class="form-row" id="row-pe-speed-list-mode" style="${speedMode === 'list' ? '' : 'display:none;'}">
                <label>数组使用方式</label>
                <select id="prop-pe-speed-list-mode">
                    <option value="sequential" ${emitter.speedListMode !== 'random' ? 'selected' : ''}>按顺序</option>
                    <option value="random" ${emitter.speedListMode === 'random' ? 'selected' : ''}>随机抽取</option>
                </select>
            </div>
            <div class="form-row" id="row-pe-speed-list-loop" style="${speedMode === 'list' ? '' : 'display:none;'}">
                <label>
                    <input type="checkbox" id="prop-pe-speed-list-loop" ${emitter.speedListLoop ? 'checked' : ''}>
                    速度数组循环
                </label>
            </div>
            <div class="form-row">
                <label>发射口偏移 (px)</label>
                <input type="number" id="prop-pe-barrel" value="${emitter.barrelLength ?? 25}" min="0" step="1">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-pe-keep-trajectory" ${emitter.keepTrajectory ? 'checked' : ''}>
                    保留完整轨迹
                </label>
            </div>
            <hr>
            <h4>角度</h4>
            <div class="form-row">
                <label>角度模式</label>
                <select id="prop-pe-angle-mode">
                    <option value="fixed" ${angleMode === 'fixed' ? 'selected' : ''}>固定</option>
                    <option value="random" ${angleMode === 'random' ? 'selected' : ''}>随机</option>
                    <option value="list" ${angleMode === 'list' ? 'selected' : ''}>数组</option>
                </select>
            </div>
            <div class="form-row" id="row-pe-direction" style="${angleMode === 'fixed' ? '' : 'display:none;'}">
                <label>固定角度 (度)</label>
                <input type="number" id="prop-pe-direction" value="${emitter.direction ?? 0}" step="5">
            </div>
            <div class="form-row" id="row-pe-angle-min" style="${angleMode === 'random' ? '' : 'display:none;'}">
                <label>最小角度 (度)</label>
                <input type="number" id="prop-pe-angle-min" value="${emitter.angleMin ?? 0}" step="5">
            </div>
            <div class="form-row" id="row-pe-angle-max" style="${angleMode === 'random' ? '' : 'display:none;'}">
                <label>最大角度 (度)</label>
                <input type="number" id="prop-pe-angle-max" value="${emitter.angleMax ?? 360}" step="5">
            </div>
            <div class="form-row" id="row-pe-angle-list" style="${angleMode === 'list' ? '' : 'display:none;'}">
                <label>角度数组 (度)</label>
                <textarea id="prop-pe-angle-list" rows="2" placeholder="例如：0, 30, 60">${angleListText}</textarea>
            </div>
            <div class="form-row" id="row-pe-angle-list-mode" style="${angleMode === 'list' ? '' : 'display:none;'}">
                <label>数组使用方式</label>
                <select id="prop-pe-angle-list-mode">
                    <option value="sequential" ${emitter.angleListMode !== 'random' ? 'selected' : ''}>按顺序</option>
                    <option value="random" ${emitter.angleListMode === 'random' ? 'selected' : ''}>随机抽取</option>
                </select>
            </div>
            <div class="form-row" id="row-pe-angle-list-loop" style="${angleMode === 'list' ? '' : 'display:none;'}">
                <label>
                    <input type="checkbox" id="prop-pe-angle-list-loop" ${emitter.angleListLoop ? 'checked' : ''}>
                    角度数组循环
                </label>
            </div>
            <hr>
            <h4>粒子模板</h4>
            <div class="form-row">
                <label>粒子类型</label>
                <select id="prop-pe-particle-type">${options}</select>
            </div>
            <div class="form-row">
                <label>粒子电荷 (C)</label>
                <input type="number" id="prop-pe-charge" value="${emitter.particleCharge}" step="1e-20">
            </div>
            <div class="form-row">
                <label>粒子质量 (kg)</label>
                <input type="number" id="prop-pe-mass" value="${emitter.particleMass}" step="1e-30">
            </div>
            <div class="form-row">
                <label>粒子半径 (px)</label>
                <input type="number" id="prop-pe-radius" value="${emitter.particleRadius}" min="2" max="20">
            </div>
            <div class="form-row">
                <label>
                    <input type="checkbox" id="prop-pe-ignore-gravity" ${emitter.ignoreGravity ? 'checked' : ''}>
                    忽略重力
                </label>
            </div>
            <div class="form-row">
                <label>重力加速度 g (m/s²)</label>
                <input type="number" id="prop-pe-gravity" value="${gravity}" min="0" step="0.1" ${emitter.ignoreGravity ? 'disabled' : ''}>
            </div>
            <button class="btn btn-primary" id="apply-pe-props">应用</button>
        `;

        const parseNumberList = (text) => {
            if (!text) return [];
            return String(text)
                .split(/[\s,;]+/g)
                .map(part => part.trim())
                .filter(Boolean)
                .map(part => Number(part))
                .filter(value => Number.isFinite(value));
        };

        const modeSelect = document.getElementById('prop-pe-mode');
        const rowInterval = document.getElementById('row-pe-interval');
        const rowTimeList = document.getElementById('row-pe-time-list');
        const syncModeRows = () => {
            const mode = modeSelect.value;
            rowInterval.style.display = mode === 'sequence' ? '' : 'none';
            rowTimeList.style.display = mode === 'time-list' ? '' : 'none';
        };
        modeSelect.addEventListener('change', syncModeRows);
        syncModeRows();

        const angleModeSelect = document.getElementById('prop-pe-angle-mode');
        const rowDirection = document.getElementById('row-pe-direction');
        const rowAngleMin = document.getElementById('row-pe-angle-min');
        const rowAngleMax = document.getElementById('row-pe-angle-max');
        const rowAngleList = document.getElementById('row-pe-angle-list');
        const rowAngleListMode = document.getElementById('row-pe-angle-list-mode');
        const rowAngleListLoop = document.getElementById('row-pe-angle-list-loop');
        const syncAngleRows = () => {
            const mode = angleModeSelect.value;
            rowDirection.style.display = mode === 'fixed' ? '' : 'none';
            rowAngleMin.style.display = mode === 'random' ? '' : 'none';
            rowAngleMax.style.display = mode === 'random' ? '' : 'none';
            rowAngleList.style.display = mode === 'list' ? '' : 'none';
            rowAngleListMode.style.display = mode === 'list' ? '' : 'none';
            rowAngleListLoop.style.display = mode === 'list' ? '' : 'none';
        };
        angleModeSelect.addEventListener('change', syncAngleRows);
        syncAngleRows();

        const speedModeSelect = document.getElementById('prop-pe-speed-mode');
        const rowSpeedFixed = document.getElementById('row-pe-speed-fixed');
        const rowSpeedMin = document.getElementById('row-pe-speed-min');
        const rowSpeedMax = document.getElementById('row-pe-speed-max');
        const rowSpeedList = document.getElementById('row-pe-speed-list');
        const rowSpeedListMode = document.getElementById('row-pe-speed-list-mode');
        const rowSpeedListLoop = document.getElementById('row-pe-speed-list-loop');
        const syncSpeedRows = () => {
            const mode = speedModeSelect.value;
            rowSpeedFixed.style.display = mode === 'fixed' ? '' : 'none';
            const showRange = mode === 'random' || mode === 'arithmetic';
            rowSpeedMin.style.display = showRange ? '' : 'none';
            rowSpeedMax.style.display = showRange ? '' : 'none';
            const showList = mode === 'list';
            rowSpeedList.style.display = showList ? '' : 'none';
            rowSpeedListMode.style.display = showList ? '' : 'none';
            rowSpeedListLoop.style.display = showList ? '' : 'none';
        };
        speedModeSelect.addEventListener('change', syncSpeedRows);
        syncSpeedRows();

        const typeSelect = document.getElementById('prop-pe-particle-type');
        const chargeInput = document.getElementById('prop-pe-charge');
        const massInput = document.getElementById('prop-pe-mass');
        const applyPreset = () => {
            const preset = presets[typeSelect.value];
            if (preset) {
                chargeInput.value = preset.charge;
                massInput.value = preset.mass;
            }
        };
        typeSelect?.addEventListener('change', () => {
            if (presets[typeSelect.value]) {
                applyPreset();
            }
        });

        const ignoreGravityInput = document.getElementById('prop-pe-ignore-gravity');
        const gravityInput = document.getElementById('prop-pe-gravity');
        const syncGravityState = () => {
            if (!ignoreGravityInput || !gravityInput) return;
            gravityInput.disabled = !!ignoreGravityInput.checked;
        };
        syncGravityState();
        ignoreGravityInput?.addEventListener('change', syncGravityState);

	        document.getElementById('apply-pe-props').addEventListener('click', () => {
	            const x = readFiniteNumber('prop-pe-x');
	            if (x !== null) emitter.x = x;
	            const y = readFiniteNumber('prop-pe-y');
	            if (y !== null) emitter.y = y;

	            const startTime = readFiniteNumber('prop-pe-start-time');
	            if (startTime !== null && startTime >= 0) emitter.startTime = startTime;
	            emitter.emissionMode = modeSelect.value;
	            const emissionCount = readFiniteNumber('prop-pe-count');
	            if (emissionCount !== null && emissionCount >= 0) emitter.emissionCount = emissionCount;
	            const emissionInterval = readFiniteNumber('prop-pe-interval');
	            if (emissionInterval !== null && emissionInterval >= 0) emitter.emissionInterval = emissionInterval;
	            emitter.timeList = parseNumberList(document.getElementById('prop-pe-time-list')?.value ?? '').map(v => Math.max(0, v));

	            emitter.speedMode = speedModeSelect.value;
	            const speedFixed = readFiniteNumber('prop-pe-speed-fixed');
	            if (speedFixed !== null && speedFixed >= 0) emitter.emissionSpeed = speedFixed * pixelsPerMeter;
	            const speedMin = readFiniteNumber('prop-pe-speed-min');
	            if (speedMin !== null && speedMin >= 0) emitter.speedMin = speedMin * pixelsPerMeter;
	            const speedMax = readFiniteNumber('prop-pe-speed-max');
	            if (speedMax !== null && speedMax >= 0) emitter.speedMax = speedMax * pixelsPerMeter;
	            emitter.speedList = parseNumberList(document.getElementById('prop-pe-speed-list')?.value ?? '').map(v => Math.max(0, v) * pixelsPerMeter);
	            emitter.speedListMode = document.getElementById('prop-pe-speed-list-mode')?.value || emitter.speedListMode || 'sequential';
	            emitter.speedListLoop = document.getElementById('prop-pe-speed-list-loop')?.checked ?? true;
	            const barrelLength = readFiniteNumber('prop-pe-barrel');
	            if (barrelLength !== null && barrelLength >= 0) emitter.barrelLength = barrelLength;
	            emitter.keepTrajectory = document.getElementById('prop-pe-keep-trajectory').checked;

	            emitter.angleMode = angleModeSelect.value;
	            const direction = readFiniteNumber('prop-pe-direction');
	            if (direction !== null) emitter.direction = direction;
	            const angleMin = readFiniteNumber('prop-pe-angle-min');
	            if (angleMin !== null) emitter.angleMin = angleMin;
	            const angleMax = readFiniteNumber('prop-pe-angle-max');
	            if (angleMax !== null) emitter.angleMax = angleMax;
	            emitter.angleList = parseNumberList(document.getElementById('prop-pe-angle-list')?.value ?? '');
	            emitter.angleListMode = document.getElementById('prop-pe-angle-list-mode')?.value || emitter.angleListMode || 'sequential';
	            emitter.angleListLoop = document.getElementById('prop-pe-angle-list-loop')?.checked ?? true;

            emitter.particleType = typeSelect.value;
            if (presets[emitter.particleType]) {
                applyPreset();
            }
	            const charge = readFiniteNumber('prop-pe-charge');
	            if (charge !== null) emitter.particleCharge = charge;
	            const mass = readFiniteNumber('prop-pe-mass');
	            if (mass !== null && mass > 0) emitter.particleMass = mass;
	            const radius = readFiniteNumber('prop-pe-radius');
	            if (radius !== null && radius > 0) emitter.particleRadius = radius;
	            emitter.ignoreGravity = document.getElementById('prop-pe-ignore-gravity').checked;
	            if (!emitter.ignoreGravity) {
	                const g = readFiniteNumber('prop-pe-gravity');
	                if (g !== null && g >= 0) {
	                    this.scene.settings.gravity = g;
	                    window.app?.syncHeaderControlsFromScene?.();
	                }
	            }

            emitter.resetRuntime?.();
            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
        });
    }
    
    renderMagneticFieldProperties(container, field) {
        const shape = field.shape || 'rect';
        const isCircle = shape === 'circle';
        const isTriangle = shape === 'triangle';

        container.innerHTML = `
            <h4>匀强磁场属性</h4>
            <div class="form-row">
                <label>形状</label>
                <select id="prop-shape">
                    <option value="rect" ${shape === 'rect' ? 'selected' : ''}>矩形</option>
                    <option value="triangle" ${shape === 'triangle' ? 'selected' : ''}>三角形</option>
                    <option value="circle" ${shape === 'circle' ? 'selected' : ''}>圆形</option>
                </select>
            </div>
            <div class="form-row">
                <label id="prop-x-label">${isCircle ? '中心 X' : 'X 坐标'}</label>
                <input type="number" id="prop-x" value="${field.x}" step="10">
            </div>
            <div class="form-row">
                <label id="prop-y-label">${isCircle ? '中心 Y' : 'Y 坐标'}</label>
                <input type="number" id="prop-y" value="${field.y}" step="10">
            </div>
            <div class="form-row" id="row-width" style="${isCircle ? 'display:none;' : ''}">
                <label id="prop-width-label">${isTriangle ? '底边宽度' : '宽度'}</label>
                <input type="number" id="prop-width" value="${field.width ?? 200}" min="10" step="10">
            </div>
            <div class="form-row" id="row-height" style="${isCircle ? 'display:none;' : ''}">
                <label id="prop-height-label">${isTriangle ? '高度' : '高度'}</label>
                <input type="number" id="prop-height" value="${field.height ?? 150}" min="10" step="10">
            </div>
            <div class="form-row" id="row-radius" style="${isCircle ? '' : 'display:none;'}">
                <label>半径</label>
                <input type="number" id="prop-radius" value="${field.radius ?? 90}" min="5" step="5">
            </div>
            <div class="form-row">
                <label>磁感应强度 (T)</label>
                <input type="number" id="prop-strength" value="${field.strength}" step="0.1">
            </div>
            <button class="btn btn-primary" id="apply-magnetic-props">应用</button>
        `;

        const shapeSelect = document.getElementById('prop-shape');
        const xLabel = document.getElementById('prop-x-label');
        const yLabel = document.getElementById('prop-y-label');
        const widthLabel = document.getElementById('prop-width-label');
        const heightLabel = document.getElementById('prop-height-label');
        const rowWidth = document.getElementById('row-width');
        const rowHeight = document.getElementById('row-height');
        const rowRadius = document.getElementById('row-radius');

        let lastShape = shapeSelect.value;
        const syncUiForShape = () => {
            const currentShape = shapeSelect.value;
            const circle = currentShape === 'circle';
            const triangle = currentShape === 'triangle';

            rowWidth.style.display = circle ? 'none' : '';
            rowHeight.style.display = circle ? 'none' : '';
            rowRadius.style.display = circle ? '' : 'none';

            xLabel.textContent = circle ? '中心 X' : 'X 坐标';
            yLabel.textContent = circle ? '中心 Y' : 'Y 坐标';
            widthLabel.textContent = triangle ? '底边宽度' : '宽度';
            heightLabel.textContent = '高度';

            // 形状切换时，尽量把当前对象的几何参数映射到新形状的输入框
            const xInput = document.getElementById('prop-x');
            const yInput = document.getElementById('prop-y');
            const wInput = document.getElementById('prop-width');
            const hInput = document.getElementById('prop-height');
            const rInput = document.getElementById('prop-radius');

            const asRect = () => {
                if (lastShape === 'circle') {
                    const r = field.radius ?? 0;
                    return { x: field.x - r, y: field.y - r, w: r * 2, h: r * 2 };
                }
                return { x: field.x, y: field.y, w: field.width ?? 200, h: field.height ?? 150 };
            };

            if (circle) {
                const rect = asRect();
                xInput.value = String(rect.x + rect.w / 2);
                yInput.value = String(rect.y + rect.h / 2);
                if (rInput) rInput.value = String(Math.max(5, Math.min(rect.w, rect.h) / 2));
            } else {
                const rect = asRect();
                xInput.value = String(rect.x);
                yInput.value = String(rect.y);
                if (wInput) wInput.value = String(Math.max(10, rect.w));
                if (hInput) hInput.value = String(Math.max(10, rect.h));
            }

            lastShape = currentShape;
        };

        shapeSelect.addEventListener('change', () => {
            syncUiForShape();
        });

	        document.getElementById('apply-magnetic-props').addEventListener('click', () => {
	            const selectedShape = shapeSelect.value;
	            field.shape = selectedShape;
	            const strength = readFiniteNumber('prop-strength');
	            if (strength !== null) field.strength = strength;

	            if (selectedShape === 'circle') {
	                const x = readFiniteNumber('prop-x');
	                if (x !== null) field.x = x;
	                const y = readFiniteNumber('prop-y');
	                if (y !== null) field.y = y;
	                const radius = readFiniteNumber('prop-radius');
	                if (radius !== null && radius > 0) {
	                    field.radius = radius;
	                    field.width = radius * 2;
	                    field.height = radius * 2;
	                }
	            } else {
	                const x = readFiniteNumber('prop-x');
	                if (x !== null) field.x = x;
	                const y = readFiniteNumber('prop-y');
	                if (y !== null) field.y = y;
	                const width = readFiniteNumber('prop-width');
	                if (width !== null && width > 0) field.width = width;
	                const height = readFiniteNumber('prop-height');
	                if (height !== null && height > 0) field.height = height;
	                const w = Number.isFinite(field.width) ? field.width : 0;
	                const h = Number.isFinite(field.height) ? field.height : 0;
	                if (w > 0 && h > 0) {
	                    field.radius = Math.min(w, h) / 2;
	                }
	            }

	            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
	        });
    }

    renderDisappearZoneProperties(container, zone) {
        container.innerHTML = `
            <h4>消失区域属性</h4>
            <div class="form-row">
                <label>中心 X</label>
                <input type="number" id="prop-zone-x" value="${zone.x}" step="10">
            </div>
            <div class="form-row">
                <label>中心 Y</label>
                <input type="number" id="prop-zone-y" value="${zone.y}" step="10">
            </div>
            <div class="form-row">
                <label>长度 (px)</label>
                <input type="number" id="prop-zone-length" value="${zone.length ?? 320}" min="30" step="10">
            </div>
            <div class="form-row">
                <label>角度 (度)</label>
                <input type="number" id="prop-zone-angle" value="${zone.angle ?? 0}" step="5">
            </div>
            <button class="btn btn-primary" id="apply-zone-props">应用</button>
        `;

	        document.getElementById('apply-zone-props').addEventListener('click', () => {
	            const x = readFiniteNumber('prop-zone-x');
	            if (x !== null) zone.x = x;
	            const y = readFiniteNumber('prop-zone-y');
	            if (y !== null) zone.y = y;
	            const length = readFiniteNumber('prop-zone-length');
	            if (length !== null && length > 0) zone.length = length;
	            const angle = readFiniteNumber('prop-zone-angle');
	            if (angle !== null) zone.angle = angle;
	            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
	        });
    }

    renderScreenProperties(container, screen) {
        container.innerHTML = `
            <h4>荧光屏属性</h4>
            <div class="form-row">
                <label>X 坐标</label>
                <input type="number" id="prop-screen-x" value="${screen.x}" step="10">
            </div>
            <div class="form-row">
                <label>Y 坐标</label>
                <input type="number" id="prop-screen-y" value="${screen.y}" step="10">
            </div>
            <div class="form-row">
                <label>正视宽度</label>
                <input type="number" id="prop-screen-width" value="${screen.width}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>正视高度</label>
                <input type="number" id="prop-screen-height" value="${screen.height}" min="50" step="10">
            </div>
            <div class="form-row">
                <label>侧视厚度</label>
                <input type="number" id="prop-screen-depth" value="${screen.depth}" min="10" step="5">
            </div>
            <div class="form-row">
                <label>视距间隔</label>
                <input type="number" id="prop-screen-gap" value="${screen.viewGap ?? 12}" min="0" step="2">
            </div>
            <div class="form-row">
                <label>光斑大小</label>
                <input type="number" id="prop-screen-spot" value="${screen.spotSize}" min="2" max="20" step="1">
            </div>
            <div class="form-row">
                <label>余辉时间 (s)</label>
                <input type="number" id="prop-screen-persistence" value="${screen.persistence}" min="0.1" step="0.1">
            </div>
            <button class="btn btn-primary" id="apply-screen-props">应用</button>
            <button class="btn" id="clear-screen-spots">清除光斑</button>
        `;

	        document.getElementById('apply-screen-props').addEventListener('click', () => {
	            const x = readFiniteNumber('prop-screen-x');
	            if (x !== null) screen.x = x;
	            const y = readFiniteNumber('prop-screen-y');
	            if (y !== null) screen.y = y;
	            const width = readFiniteNumber('prop-screen-width');
	            if (width !== null && width > 0) screen.width = width;
	            const height = readFiniteNumber('prop-screen-height');
	            if (height !== null && height > 0) screen.height = height;
	            const depth = readFiniteNumber('prop-screen-depth');
	            if (depth !== null && depth > 0) screen.depth = depth;
	            const gap = readFiniteNumber('prop-screen-gap');
	            if (gap !== null && gap >= 0) screen.viewGap = gap;
	            const spot = readFiniteNumber('prop-screen-spot');
	            if (spot !== null && spot > 0) screen.spotSize = spot;
	            const persistence = readFiniteNumber('prop-screen-persistence');
	            if (persistence !== null && persistence >= 0) screen.persistence = persistence;
	            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
	        });

        document.getElementById('clear-screen-spots').addEventListener('click', () => {
            screen.hits = [];
            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
        });
    }
}
