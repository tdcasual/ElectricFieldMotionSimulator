/**
 * 属性面板
 */

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
    }
    
    show(object) {
        this.currentObject = object;
        const content = document.getElementById('property-content');
        content.innerHTML = '';
        
        if (object.type === 'particle') {
            this.renderParticleProperties(content, object);
        } else if (object.type.includes('electric') || object.type === 'parallel-plate-capacitor' || object.type === 'vertical-parallel-plate-capacitor') {
            this.renderElectricFieldProperties(content, object);
        } else if (object.type === 'magnetic-field') {
            this.renderMagneticFieldProperties(content, object);
        } else if (object.type === 'disappear-zone') {
            this.renderDisappearZoneProperties(content, object);
        } else if (object.type === 'electron-gun') {
            this.renderElectronGunProperties(content, object);
        } else if (object.type === 'programmable-emitter') {
            this.renderProgrammableEmitterProperties(content, object);
        } else if (object.type === 'fluorescent-screen') {
            this.renderScreenProperties(content, object);
        }
        
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
                <input type="number" id="prop-vx" value="${particle.velocity.x / pixelsPerMeter}" step="10">
            </div>
            <div class="form-row">
                <label>当前速度 vy (m/s)</label>
                <input type="number" id="prop-vy" value="${particle.velocity.y / pixelsPerMeter}" step="10">
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
        
        document.getElementById('apply-particle-props').addEventListener('click', () => {
            const mass = parseFloat(document.getElementById('prop-mass')?.value);
            if (Number.isFinite(mass) && mass > 0) {
                particle.mass = mass;
            }

            const charge = parseFloat(document.getElementById('prop-charge')?.value);
            if (Number.isFinite(charge)) {
                particle.charge = charge;
            }

            const vx = parseFloat(document.getElementById('prop-vx')?.value);
            if (Number.isFinite(vx)) {
                particle.velocity.x = vx * pixelsPerMeter;
            }

            const vy = parseFloat(document.getElementById('prop-vy')?.value);
            if (Number.isFinite(vy)) {
                particle.velocity.y = vy * pixelsPerMeter;
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
            field.x = parseFloat(document.getElementById('prop-x').value);
            field.y = parseFloat(document.getElementById('prop-y').value);
            if (field.width !== undefined && field.height !== undefined && field.type !== 'vertical-parallel-plate-capacitor') {
                field.width = parseFloat(document.getElementById('prop-width').value);
                field.height = parseFloat(document.getElementById('prop-height').value);
            }
            if (field.type === 'vertical-parallel-plate-capacitor') {
                field.height = parseFloat(document.getElementById('prop-height').value);
            }
            if (field.radius !== undefined) {
                field.radius = parseFloat(document.getElementById('prop-radius').value);
            }
            field.strength = parseFloat(document.getElementById('prop-strength').value);
            const directionInput = document.getElementById('prop-direction');
            if (directionInput) {
                field.direction = parseFloat(directionInput.value);
            }
            
            // 处理特定属性
            if (field.type === 'semicircle-electric-field') {
                const orientationInput = document.getElementById('prop-orientation');
                if (orientationInput) {
                    field.orientation = parseFloat(orientationInput.value);
                }
            }
            
            if (field.type === 'parallel-plate-capacitor' || field.type === 'vertical-parallel-plate-capacitor') {
                const plateWidthInput = document.getElementById('prop-plate-width');
                const plateDistanceInput = document.getElementById('prop-plate-distance');
                const polarityInput = document.getElementById('prop-polarity');
                const sourceTypeInput = document.getElementById('prop-source-type');
                const acAmplitudeInput = document.getElementById('prop-ac-amplitude');
                const acFrequencyInput = document.getElementById('prop-ac-frequency');
                const acPhaseInput = document.getElementById('prop-ac-phase');
                const dcBiasInput = document.getElementById('prop-dc-bias');
                const waveformInput = document.getElementById('prop-waveform');
                const customExprInput = document.getElementById('prop-custom-expression');
                if (plateWidthInput) {
                    field.width = parseFloat(plateWidthInput.value);
                }
                if (plateDistanceInput) {
                    field.plateDistance = parseFloat(plateDistanceInput.value);
                }
                if (polarityInput) {
                    field.polarity = parseInt(polarityInput.value);
                }
                if (sourceTypeInput) {
                    field.sourceType = sourceTypeInput.value;
                }
                if (acAmplitudeInput) {
                    field.acAmplitude = parseFloat(acAmplitudeInput.value);
                }
                if (acFrequencyInput) {
                    field.acFrequency = parseFloat(acFrequencyInput.value);
                }
                if (acPhaseInput) {
                    field.acPhase = parseFloat(acPhaseInput.value);
                }
                if (dcBiasInput) {
                    field.dcBias = parseFloat(dcBiasInput.value);
                }
                if (waveformInput) {
                    field.waveform = waveformInput.value;
                }
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
            emitter.x = parseFloat(document.getElementById('prop-gun-x').value);
            emitter.y = parseFloat(document.getElementById('prop-gun-y').value);
            emitter.direction = parseFloat(document.getElementById('prop-gun-direction').value);
            emitter.emissionRate = parseFloat(document.getElementById('prop-gun-rate').value);
            emitter.emissionSpeed = parseFloat(document.getElementById('prop-gun-speed').value) * pixelsPerMeter;

            const chosenType = typeSelect.value;
            emitter.particleType = chosenType;
            if (presets[chosenType]) {
                applyPreset();
            }

            emitter.particleCharge = parseFloat(chargeInput.value);
            emitter.particleMass = parseFloat(massInput.value);
            emitter.particleRadius = parseFloat(document.getElementById('prop-gun-radius').value);
            emitter.ignoreGravity = document.getElementById('prop-gun-ignore-gravity').checked;
            if (!emitter.ignoreGravity) {
                const g = parseFloat(document.getElementById('prop-gun-gravity').value);
                if (Number.isFinite(g) && g >= 0) {
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
            emitter.x = parseFloat(document.getElementById('prop-pe-x').value);
            emitter.y = parseFloat(document.getElementById('prop-pe-y').value);

            emitter.startTime = parseFloat(document.getElementById('prop-pe-start-time').value);
            emitter.emissionMode = modeSelect.value;
            emitter.emissionCount = parseFloat(document.getElementById('prop-pe-count').value);
            emitter.emissionInterval = parseFloat(document.getElementById('prop-pe-interval')?.value ?? emitter.emissionInterval ?? 0.2);
            emitter.timeList = parseNumberList(document.getElementById('prop-pe-time-list')?.value ?? '').map(v => Math.max(0, v));

            emitter.speedMode = speedModeSelect.value;
            emitter.emissionSpeed = parseFloat(document.getElementById('prop-pe-speed-fixed')?.value ?? speedFixedValue) * pixelsPerMeter;
            emitter.speedMin = parseFloat(document.getElementById('prop-pe-speed-min')?.value ?? speedMinValue) * pixelsPerMeter;
            emitter.speedMax = parseFloat(document.getElementById('prop-pe-speed-max')?.value ?? speedMaxValue) * pixelsPerMeter;
            emitter.speedList = parseNumberList(document.getElementById('prop-pe-speed-list')?.value ?? '').map(v => Math.max(0, v) * pixelsPerMeter);
            emitter.speedListMode = document.getElementById('prop-pe-speed-list-mode')?.value || emitter.speedListMode || 'sequential';
            emitter.speedListLoop = document.getElementById('prop-pe-speed-list-loop')?.checked ?? true;
            emitter.barrelLength = parseFloat(document.getElementById('prop-pe-barrel').value);
            emitter.keepTrajectory = document.getElementById('prop-pe-keep-trajectory').checked;

            emitter.angleMode = angleModeSelect.value;
            emitter.direction = parseFloat(document.getElementById('prop-pe-direction')?.value ?? emitter.direction ?? 0);
            emitter.angleMin = parseFloat(document.getElementById('prop-pe-angle-min')?.value ?? emitter.angleMin ?? 0);
            emitter.angleMax = parseFloat(document.getElementById('prop-pe-angle-max')?.value ?? emitter.angleMax ?? 360);
            emitter.angleList = parseNumberList(document.getElementById('prop-pe-angle-list')?.value ?? '');
            emitter.angleListMode = document.getElementById('prop-pe-angle-list-mode')?.value || emitter.angleListMode || 'sequential';
            emitter.angleListLoop = document.getElementById('prop-pe-angle-list-loop')?.checked ?? true;

            emitter.particleType = typeSelect.value;
            if (presets[emitter.particleType]) {
                applyPreset();
            }
            emitter.particleCharge = parseFloat(chargeInput.value);
            emitter.particleMass = parseFloat(massInput.value);
            emitter.particleRadius = parseFloat(document.getElementById('prop-pe-radius').value);
            emitter.ignoreGravity = document.getElementById('prop-pe-ignore-gravity').checked;
            if (!emitter.ignoreGravity) {
                const g = parseFloat(document.getElementById('prop-pe-gravity').value);
                if (Number.isFinite(g) && g >= 0) {
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
            field.strength = parseFloat(document.getElementById('prop-strength').value);

            if (selectedShape === 'circle') {
                field.x = parseFloat(document.getElementById('prop-x').value);
                field.y = parseFloat(document.getElementById('prop-y').value);
                field.radius = parseFloat(document.getElementById('prop-radius').value);
                field.width = field.radius * 2;
                field.height = field.radius * 2;
            } else {
                field.x = parseFloat(document.getElementById('prop-x').value);
                field.y = parseFloat(document.getElementById('prop-y').value);
                field.width = parseFloat(document.getElementById('prop-width').value);
                field.height = parseFloat(document.getElementById('prop-height').value);
                field.radius = Math.min(field.width, field.height) / 2;
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
            zone.x = parseFloat(document.getElementById('prop-zone-x').value);
            zone.y = parseFloat(document.getElementById('prop-zone-y').value);
            zone.length = parseFloat(document.getElementById('prop-zone-length').value);
            zone.angle = parseFloat(document.getElementById('prop-zone-angle').value);
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
            screen.x = parseFloat(document.getElementById('prop-screen-x').value);
            screen.y = parseFloat(document.getElementById('prop-screen-y').value);
            screen.width = parseFloat(document.getElementById('prop-screen-width').value);
            screen.height = parseFloat(document.getElementById('prop-screen-height').value);
            screen.depth = parseFloat(document.getElementById('prop-screen-depth').value);
            screen.viewGap = parseFloat(document.getElementById('prop-screen-gap').value);
            screen.spotSize = parseFloat(document.getElementById('prop-screen-spot').value);
            screen.persistence = parseFloat(document.getElementById('prop-screen-persistence').value);
            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
        });

        document.getElementById('clear-screen-spots').addEventListener('click', () => {
            screen.hits = [];
            window.app?.requestRender?.({ invalidateFields: true, updateUI: false });
        });
    }
}
